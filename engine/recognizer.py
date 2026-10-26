import os
import json
import cv2
import numpy as np
from typing import Tuple, Dict, Optional, List

DEFAULT_MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "models")
DEFAULT_MODEL_PATH = os.path.join(DEFAULT_MODEL_DIR, "face_trainer.yml")
DEFAULT_LABEL_PATH = os.path.join(DEFAULT_MODEL_DIR, "label_map.json")


class FaceRecognizerEngine:
    def __init__(self, model_path: str = DEFAULT_MODEL_PATH, label_path: str = DEFAULT_LABEL_PATH,
                 confidence_threshold: float = 43.5):
        """
        confidence_threshold: In LBPH, distance below 43.5 is considered a genuine positive match.
        Distance > 43.5 indicates an imposter / unregistered face and is strictly rejected.
        """
        self.model_path = model_path
        self.label_path = label_path
        self.confidence_threshold = confidence_threshold

        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.recognizer = cv2.face.LBPHFaceRecognizer_create(
            radius=1,
            neighbors=8,
            grid_x=8,
            grid_y=8
        )
        self.label_to_roll: Dict[str, str] = {}
        self.roll_to_label: Dict[str, int] = {}
        self.load_model()

    @property
    def is_trained(self) -> bool:
        """Dynamically check if trained model file and label map exist on disk."""
        return os.path.exists(self.model_path) and os.path.exists(self.label_path) and len(self.label_to_roll) > 0

    def load_model(self) -> bool:
        """Load trained model and label dictionary if available."""
        if not os.path.exists(self.model_path) or not os.path.exists(self.label_path):
            self.label_to_roll = {}
            self.roll_to_label = {}
            return False

        try:
            self.recognizer.read(self.model_path)
            with open(self.label_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.label_to_roll = data.get("label_to_roll", {})
                self.roll_to_label = data.get("roll_to_label", {})
            return True
        except Exception as e:
            print(f"Error loading face recognizer: {e}")
            self.label_to_roll = {}
            self.roll_to_label = {}
            return False

    def train(self, dataset_dir: str) -> Tuple[bool, str, int, int]:
        """
        Scan dataset directory for student subfolders, train LBPH model, and persist files.
        Returns: (success: bool, message: str, total_faces: int, total_students: int)
        """
        if not os.path.exists(dataset_dir):
            return False, f"Dataset directory not found: {dataset_dir}", 0, 0

        student_folders = [f for f in os.listdir(dataset_dir) if os.path.isdir(os.path.join(dataset_dir, f))]
        if not student_folders:
            return False, "No student face directories found in dataset.", 0, 0

        faces: List[np.ndarray] = []
        labels: List[int] = []
        new_label_to_roll: Dict[str, str] = {}
        new_roll_to_label: Dict[str, int] = {}

        current_label_id = 1
        for roll_folder in sorted(student_folders):
            roll_no = roll_folder.strip().upper()
            student_path = os.path.join(dataset_dir, roll_folder)
            image_files = [f for f in os.listdir(student_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

            if not image_files:
                continue

            new_label_to_roll[str(current_label_id)] = roll_no
            new_roll_to_label[roll_no] = current_label_id

            student_faces: List[np.ndarray] = []
            for img_name in image_files:
                img_path = os.path.join(student_path, img_name)
                gray_img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
                if gray_img is None:
                    continue
                # Ensure standard 200x200 shape
                if gray_img.shape != (200, 200):
                    gray_img = cv2.resize(gray_img, (200, 200), interpolation=cv2.INTER_AREA)

                student_faces.append(gray_img)

            # If student has few images (< 10), augment them so the model has proper statistical distribution
            if 0 < len(student_faces) < 10:
                augmented: List[np.ndarray] = []
                for sf in student_faces:
                    augmented.append(cv2.convertScaleAbs(sf, alpha=1.05, beta=12))
                    augmented.append(cv2.convertScaleAbs(sf, alpha=0.95, beta=-12))
                    augmented.append(cv2.convertScaleAbs(sf, alpha=1.0, beta=18))
                    augmented.append(cv2.convertScaleAbs(sf, alpha=1.0, beta=-18))
                    augmented.append(cv2.resize(sf[8:192, 8:192], (200, 200)))
                    augmented.append(cv2.resize(sf[4:196, 4:196], (200, 200)))
                    augmented.append(cv2.resize(sf[12:188, 12:188], (200, 200)))
                student_faces.extend(augmented)

            for sf in student_faces:
                faces.append(sf)
                labels.append(current_label_id)

            current_label_id += 1

        if not faces:
            return False, "No valid face images found in dataset folders.", 0, 0

        try:
            self.recognizer.train(faces, np.array(labels, dtype=np.int32))
            self.recognizer.write(self.model_path)

            self.label_to_roll = new_label_to_roll
            self.roll_to_label = new_roll_to_label

            with open(self.label_path, "w", encoding="utf-8") as f:
                json.dump({
                    "label_to_roll": self.label_to_roll,
                    "roll_to_label": self.roll_to_label
                }, f, indent=2)

            student_count = len(new_roll_to_label)
            return True, f"Training complete: {len(faces)} photos across {student_count} student(s).", len(faces), student_count
        except Exception as e:
            return False, f"Failed to train model: {str(e)}", 0, 0

    def predict(self, face_crop: np.ndarray) -> Tuple[str, float, bool]:
        """
        Predict student identity for a single preprocessed face crop.
        Returns:
            (roll_no: str, similarity_percentage: float, is_confident: bool)
        """
        if not self.is_trained:
            return "Unknown", 0.0, False

        if face_crop is None or face_crop.size == 0:
            return "Unknown", 0.0, False

        # Ensure grayscale and correct size
        if len(face_crop.shape) == 3:
            face_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        if face_crop.shape != (200, 200):
            face_crop = cv2.resize(face_crop, (200, 200), interpolation=cv2.INTER_AREA)

        try:
            label_id, distance = self.recognizer.predict(face_crop)
            is_confident = (distance <= self.confidence_threshold)

            if is_confident:
                # Genuine match: Distance between 0 and 48
                # 0 dist -> 100%, 48 dist -> 65%
                similarity = round(max(65.0, min(100.0, 100.0 - (distance * 0.73))), 1)
                roll_str = self.label_to_roll.get(str(label_id), "Unknown")
            else:
                # Unregistered face / imposter: strictly rejected as Unknown
                similarity = round(max(0.0, min(54.0, 100.0 - (distance * 0.9))), 1)
                roll_str = "Unknown"

            return roll_str, similarity, is_confident
        except Exception as e:
            print(f"Prediction error: {e}")
            return "Unknown", 0.0, False
