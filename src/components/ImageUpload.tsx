import { useState, useRef, ChangeEvent } from 'react';
import { Button } from './Button';
import { validateImageFile, compressImage, IMAGE_CONSTANTS } from '../utils/imageHelpers';

interface ImageUploadProps {
  onImageChange: (imageData: string | null) => void;
  currentImage?: string | null;
  maxSizeMB?: number;
}

export function ImageUpload({
  onImageChange,
  currentImage,
  maxSizeMB = IMAGE_CONSTANTS.MAX_SIZE_MB
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      setIsProcessing(false);
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file, maxSizeMB);
      setPreview(compressedDataUrl);
      onImageChange(compressedDataUrl);
    } catch (err) {
      setError('Failed to process image. Please try another image.');
      console.error('Image processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="image-upload-container">
      <label className="form-label">
        Product Image <span className="optional-label">(Optional)</span>
      </label>

      <div className="image-upload-area">
        {preview ? (
          <div className="image-preview-container">
            <img src={preview} alt="Product preview" className="image-preview" />
            <div className="image-overlay">
              <Button
                type="button"
                variant="secondary"
                onClick={handleRemove}
                className="btn-small"
              >
                Remove
              </Button>
              <Button
                type="button"
                onClick={handleButtonClick}
                className="btn-small"
                disabled={isProcessing}
              >
                Change
              </Button>
            </div>
          </div>
        ) : (
          <div className="image-upload-placeholder" onClick={handleButtonClick}>
            <div className="upload-icon">📷</div>
            <p className="upload-text">Click to add a photo of your produce</p>
            <p className="upload-hint">JPEG or PNG, max {maxSizeMB}MB</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_CONSTANTS.ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="image-input-hidden"
        aria-label="Upload product image"
      />

      {error && <span className="error-text">{error}</span>}
      {isProcessing && <span className="processing-text">Processing image...</span>}
    </div>
  );
}
