import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

export async function loadFaceApiModels() {
  if (modelsLoaded) return true;
  try {
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
    console.log('face-api models successfully loaded into React application.');
    return true;
  } catch (err) {
    console.error('Failed to load face-api models:', err);
    return false;
  }
}

/**
 * Detect single face with 128-d descriptor.
 * Uses adaptive multi-scale TinyFaceDetector with forgiving threshold for laptop webcams.
 */
export async function getFaceDescriptor(videoOrCanvasOrImage) {
  if (!modelsLoaded) {
    await loadFaceApiModels();
  }

  // Primary attempt: standard scale (320px) with sensitive threshold (0.25)
  let detection = await faceapi
    .detectSingleFace(videoOrCanvasOrImage, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.25 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  // Fallback 1: higher resolution scale (416px) for distant or small faces
  if (!detection) {
    detection = await faceapi
      .detectSingleFace(videoOrCanvasOrImage, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
  }

  // Fallback 2: close-up scale (224px) for webcam proximity
  if (!detection) {
    detection = await faceapi
      .detectSingleFace(videoOrCanvasOrImage, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.2 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
  }

  return detection || null;
}

/**
 * Detect all faces in video frame with descriptors
 */
export async function getAllFacesWithDescriptors(videoElement) {
  if (!modelsLoaded) {
    await loadFaceApiModels();
  }
  const detections = await faceapi
    .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections || [];
}

/**
 * Build labeled face descriptors from MongoDB student list
 */
export function buildLabeledFaceDescriptors(students) {
  const labeled = [];

  students.forEach(student => {
    if (student.faceDescriptors && student.faceDescriptors.length > 0) {
      const descriptors = student.faceDescriptors.map(d => new Float32Array(d));
      labeled.push(new faceapi.LabeledFaceDescriptors(student.rollNo, descriptors));
    }
  });

  return labeled;
}

/**
 * Find best matching student descriptor.
 * Uses strict Euclidean distance gate (default 0.42) to prevent false positives.
 * In ResNet-34 128-d metric space:
 *   - Same person: distance in [0.15, 0.40]
 *   - Different person: distance in [0.48, 0.75]
 */
export function findBestMatch(descriptor, labeledDescriptors, threshold = 0.42) {
  if (!labeledDescriptors || labeledDescriptors.length === 0) {
    return { isMatch: false, label: 'Unknown Face', distance: 1.0, confidence: 0 };
  }

  const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, threshold);
  const bestMatch = faceMatcher.findBestMatch(descriptor);
  const dist = Math.round(bestMatch.distance * 100) / 100;

  // Genuine Euclidean similarity percentage without artificial clamping
  const similarity = Math.max(0, Math.min(100, Math.round((1 - Math.pow(bestMatch.distance, 1.25)) * 100)));

  if (bestMatch.label !== 'unknown' && bestMatch.distance < threshold) {
    return {
      isMatch: true,
      rollNo: bestMatch.label,
      distance: dist,
      confidence: similarity
    };
  }

  return {
    isMatch: false,
    label: 'Unknown Face',
    distance: dist,
    confidence: similarity
  };
}
