import os
import unittest
import tempfile
import shutil
import cv2
import numpy as np

from engine.detector import FaceDetector
from engine.dataset_collector import DatasetCollector
from engine.recognizer import FaceRecognizerEngine


class TestEngine(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.dataset_dir = os.path.join(self.test_dir, "dataset")
        self.models_dir = os.path.join(self.test_dir, "models")
        os.makedirs(self.dataset_dir, exist_ok=True)
        os.makedirs(self.models_dir, exist_ok=True)

        self.model_path = os.path.join(self.models_dir, "test_trainer.yml")
        self.label_path = os.path.join(self.models_dir, "test_labels.json")

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_detector_initialization_and_drawing(self):
        detector = FaceDetector()
        self.assertIsNotNone(detector.classifier)

        # Create dummy image
        img = np.zeros((300, 300, 3), dtype=np.uint8)
        cv2.circle(img, (150, 150), 50, (255, 255, 255), -1)

        # Test preprocessing
        preprocessed = detector.preprocess(img)
        self.assertEqual(preprocessed.shape, (300, 300))

        # Test crop face
        cropped = detector.crop_face(img, (100, 100, 100, 100))
        self.assertIsNotNone(cropped)
        self.assertEqual(cropped.shape, (200, 200))

        # Test drawing annotation
        annotated = detector.draw_annotation(img, (50, 50, 100, 100), "TEST STUDENT", subtitle="CS101")
        self.assertEqual(annotated.shape, img.shape)

    def test_dataset_collector(self):
        collector = DatasetCollector(self.dataset_dir)
        folder = collector.get_student_folder("CS201")
        self.assertTrue(os.path.exists(folder))
        self.assertEqual(collector.get_sample_count("CS201"), 0)

    def test_recognizer_train_and_predict(self):
        # Create synthetic face dataset for 2 simulated students
        student1_dir = os.path.join(self.dataset_dir, "STU01")
        student2_dir = os.path.join(self.dataset_dir, "STU02")
        os.makedirs(student1_dir, exist_ok=True)
        os.makedirs(student2_dir, exist_ok=True)

        # Generate distinctive synthetic patterns (gradients)
        for i in range(5):
            # Pattern 1: Horizontal gradient + noise
            img1 = np.tile(np.linspace(20, 200, 200, dtype=np.uint8), (200, 1))
            cv2.imwrite(os.path.join(student1_dir, f"sample_{i}.jpg"), img1)

            # Pattern 2: Vertical gradient + noise
            img2 = np.tile(np.linspace(50, 220, 200, dtype=np.uint8).reshape(-1, 1), (1, 200))
            cv2.imwrite(os.path.join(student2_dir, f"sample_{i}.jpg"), img2)

        recognizer = FaceRecognizerEngine(
            model_path=self.model_path,
            label_path=self.label_path,
            confidence_threshold=80.0
        )
        self.assertFalse(recognizer.is_trained)

        # Train
        success, msg, total_faces, student_count = recognizer.train(self.dataset_dir)
        self.assertTrue(success)
        self.assertEqual(total_faces, 10)
        self.assertEqual(student_count, 2)
        self.assertTrue(os.path.exists(self.model_path))
        self.assertTrue(os.path.exists(self.label_path))

        # Test prediction on matching pattern
        test_img1 = np.tile(np.linspace(20, 200, 200, dtype=np.uint8), (200, 1))
        pred_roll, similarity, is_confident = recognizer.predict(test_img1)
        self.assertEqual(pred_roll, "STU01")
        self.assertTrue(is_confident)
        self.assertGreater(similarity, 70.0)


if __name__ == "__main__":
    unittest.main()
