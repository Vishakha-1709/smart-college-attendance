import os
import cv2
import numpy as np
from typing import Tuple, List, Optional
from engine.detector import FaceDetector

DEFAULT_DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "dataset")


class DatasetCollector:
    def __init__(self, dataset_dir: str = DEFAULT_DATASET_DIR):
        self.dataset_dir = dataset_dir
        os.makedirs(self.dataset_dir, exist_ok=True)
        self.detector = FaceDetector()

    def get_student_folder(self, roll_no: str) -> str:
        """Get or create directory for given student roll number."""
        clean_roll = roll_no.strip().upper()
        folder = os.path.join(self.dataset_dir, clean_roll)
        os.makedirs(folder, exist_ok=True)
        return folder

    def get_sample_count(self, roll_no: str) -> int:
        """Count saved face crops for a student."""
        folder = self.get_student_folder(roll_no)
        files = [f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        return len(files)

    def save_sample_from_frame(self, frame: np.ndarray, roll_no: str, target_size: Tuple[int, int] = (200, 200)) -> Tuple[bool, str, int]:
        """
        Detect face in frame, crop, validate sharpness, and save into student's dataset directory.
        Returns: (success, message, new_total_count)
        """
        faces = self.detector.detect_faces(frame)
        if len(faces) == 0:
            return False, "No face detected in frame. Please look directly at camera.", self.get_sample_count(roll_no)
        if len(faces) > 1:
            return False, "Multiple faces detected. Ensure only one person is in the frame.", self.get_sample_count(roll_no)

        bbox = faces[0]
        face_crop = self.detector.crop_face(frame, bbox, target_size=target_size)
        if face_crop is None:
            return False, "Failed to crop face region.", self.get_sample_count(roll_no)

        if not self.detector.is_blur_free(face_crop, threshold=20.0):
            return False, "Sample is slightly blurry. Hold steady for capture.", self.get_sample_count(roll_no)

        folder = self.get_student_folder(roll_no)
        current_count = self.get_sample_count(roll_no)
        filename = f"face_{current_count + 1:03d}.jpg"
        save_path = os.path.join(folder, filename)

        cv2.imwrite(save_path, face_crop)
        new_count = current_count + 1
        return True, f"Saved sample #{new_count}", new_count

    def clear_student_samples(self, roll_no: str) -> int:
        """Delete all saved samples for a student."""
        folder = self.get_student_folder(roll_no)
        deleted = 0
        for f in os.listdir(folder):
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                os.remove(os.path.join(folder, f))
                deleted += 1
        return deleted
