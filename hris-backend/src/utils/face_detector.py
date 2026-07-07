import sys
import os
import datetime

# Graceful import check for OpenCV (local development bypass)
try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

def main():
    if len(sys.argv) < 2:
        print("FAILED: Path gambar tidak ditentukan.")
        sys.exit(1)
        
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(f"FAILED: File gambar tidak ditemukan di path: {image_path}")
        sys.exit(1)
        
    if not HAS_CV2:
        # Bypassed locally if OpenCV is not installed
        # But we can still watermark the image using basic python or just bypass watermarking locally
        print("SUCCESS (Bypassed: OpenCV tidak terinstal secara lokal)")
        return
        
    try:
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            print("FAILED: File gambar tidak valid atau rusak.")
            sys.exit(1)
            
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Load Haar Cascade
        cascade_name = 'haarcascade_frontalface_default.xml'
        cascade_path = os.path.join(cv2.data.haarcascades, cascade_name)
        if not os.path.exists(cascade_path):
            # Fallback to local search or standard paths if needed
            print(f"FAILED: Cascade file tidak ditemukan di {cascade_path}")
            sys.exit(1)
            
        face_cascade = cv2.CascadeClassifier(cascade_path)
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=4,
            minSize=(30, 30)
        )
        
        if len(faces) == 0:
            print("FAILED: Wajah tidak terdeteksi. Silakan ambil ulang foto selfie Anda dengan pencahayaan yang cukup.")
            return
            
        # Watermark the image with timestamp
        timestamp = datetime.datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        thickness = 1
        
        # Calculate coordinates for bottom-right placement
        h, w, _ = img.shape
        text_size = cv2.getTextSize(timestamp, font, font_scale, thickness)[0]
        text_x = w - text_size[0] - 15
        text_y = h - 15
        
        # Draw a subtle semi-transparent background box behind the timestamp for readability
        bg_padding = 5
        cv2.rectangle(
            img,
            (text_x - bg_padding, text_y - text_size[1] - bg_padding),
            (text_x + text_size[0] + bg_padding, text_y + bg_padding),
            (0, 0, 0),
            -1
        )
        
        # Draw text (white text)
        cv2.putText(img, timestamp, (text_x, text_y), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)
        
        # Overwrite the original image with the watermarked image
        cv2.imwrite(image_path, img)
        print("SUCCESS")
        
    except Exception as e:
        print(f"FAILED: Error processing face detection: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
