import cv2
import numpy as np
from typing import List, Tuple, Optional

class FaceDetector:
    def __init__(self, min_face_size: Tuple[int, int] = (60, 60), scale_factor: float = 1.1, min_neighbors: int = 4):
        self.min_face_size = min_face_size
        self.scale_factor = scale_factor
        self.min_neighbors = min_neighbors

        # Dual cascade classifiers: alt2 is superior for glasses/lighting, default is solid fallback
        alt2_path = cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"
        default_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        
        self.primary_classifier = cv2.CascadeClassifier(alt2_path)
        self.fallback_classifier = cv2.CascadeClassifier(default_path)
        self.classifier = self.primary_classifier  # Alias for compatibility
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    def preprocess(self, frame: np.ndarray) -> np.ndarray:
        """Convert to grayscale and enhance contrast with CLAHE."""
        if len(frame.shape) == 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = frame.copy()
        equalized = self.clahe.apply(gray)
        return equalized

    def detect_faces(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detect faces in frame using multi-pass cascade detection.
        Returns list of bounding boxes: [(x, y, w, h), ...]
        """
        if frame is None or frame.size == 0:
            return []

        if len(frame.shape) == 3:
            raw_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            raw_gray = frame.copy()

        enhanced_gray = self.clahe.apply(raw_gray)

        # Pass 1: Primary classifier (alt2) on enhanced grayscale
        faces = self.primary_classifier.detectMultiScale(
            enhanced_gray,
            scaleFactor=self.scale_factor,
            minNeighbors=self.min_neighbors,
            minSize=self.min_face_size,
            flags=cv2.CASCADE_SCALE_IMAGE
        )

        # Pass 2: Primary classifier on raw grayscale if no face found
        if len(faces) == 0:
            faces = self.primary_classifier.detectMultiScale(
                raw_gray,
                scaleFactor=self.scale_factor,
                minNeighbors=self.min_neighbors,
                minSize=self.min_face_size,
                flags=cv2.CASCADE_SCALE_IMAGE
            )

        # Pass 3: Fallback classifier (default) if still no face found
        if len(faces) == 0:
            faces = self.fallback_classifier.detectMultiScale(
                enhanced_gray,
                scaleFactor=self.scale_factor,
                minNeighbors=self.min_neighbors,
                minSize=self.min_face_size,
                flags=cv2.CASCADE_SCALE_IMAGE
            )

        return [tuple(f) for f in faces]

    def crop_face(self, frame: np.ndarray, bbox: Tuple[int, int, int, int], target_size: Tuple[int, int] = (200, 200)) -> Optional[np.ndarray]:
        """Crop and resize the detected face region."""
        x, y, w, h = bbox
        h_frame, w_frame = frame.shape[:2]

        # Add small margin (5%) around face if available
        margin_x = int(w * 0.05)
        margin_y = int(h * 0.05)
        x1 = max(0, x - margin_x)
        y1 = max(0, y - margin_y)
        x2 = min(w_frame, x + w + margin_x)
        y2 = min(h_frame, y + h + margin_y)

        cropped = frame[y1:y2, x1:x2]
        if cropped.size == 0:
            return None

        # Convert to grayscale if not already
        if len(cropped.shape) == 3:
            cropped = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)

        # Apply CLAHE & resize
        cropped = self.clahe.apply(cropped)
        resized = cv2.resize(cropped, target_size, interpolation=cv2.INTER_AREA)
        return resized

    def is_blur_free(self, face_gray: np.ndarray, threshold: float = 30.0) -> bool:
        """Check image sharpness using Laplacian variance to avoid blurry datasets."""
        var = cv2.Laplacian(face_gray, cv2.CV_64F).var()
        return var >= threshold

    def draw_annotation(self, frame: np.ndarray, bbox: Tuple[int, int, int, int], label: str,
                        color: Tuple[int, int, int] = (0, 200, 80), subtitle: str = "") -> np.ndarray:
        """
        Draw a stylish bounding box with label header.
        frame: BGR image.
        color: BGR tuple. Default emerald green (0, 200, 80).
        """
        out = frame.copy()
        x, y, w, h = bbox

        # Draw main bounding box
        cv2.rectangle(out, (x, y), (x + w, y + h), color, 2)

        # Corner accents for a sleek modern HUD look
        corner_len = min(20, int(w * 0.2))
        t = 3
        # Top-left
        cv2.line(out, (x, y), (x + corner_len, y), color, t)
        cv2.line(out, (x, y), (x, y + corner_len), color, t)
        # Top-right
        cv2.line(out, (x + w, y), (x + w - corner_len, y), color, t)
        cv2.line(out, (x + w, y), (x + w, y + corner_len), color, t)
        # Bottom-left
        cv2.line(out, (x, y + h), (x + corner_len, y + h), color, t)
        cv2.line(out, (x, y + h), (x, y + h - corner_len), color, t)
        # Bottom-right
        cv2.line(out, (x + w, y + h), (x + w - corner_len, y + h), color, t)
        cv2.line(out, (x + w, y + h), (x + w, y + h - corner_len), color, t)

        # Draw Label Banner
        text = label
        if subtitle:
            text += f" | {subtitle}"

        (text_w, text_h), baseline = cv2.getTextSize(text, cv2.FONT_HERSHEY_DUPLEX, 0.55, 1)
        bg_y1 = max(0, y - text_h - 12)
        bg_y2 = y
        bg_x1 = x
        bg_x2 = x + text_w + 12

        cv2.rectangle(out, (bg_x1, bg_y1), (bg_x2, bg_y2), color, -1)
        cv2.putText(out, text, (bg_x1 + 6, bg_y2 - 6), cv2.FONT_HERSHEY_DUPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)

        return out
