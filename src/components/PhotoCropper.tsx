import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imageSrc: string;
  onCropped: (blob: Blob) => void;
  aspect?: number;
}

const centeredCrop = (w: number, h: number, aspect: number) =>
  centerCrop(makeAspectCrop({ unit: "%", width: 90 }, aspect, w, h), w, h);

const PhotoCropper = ({ open, onOpenChange, imageSrc, onCropped, aspect = 1 }: Props) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop>();

  const onLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget;
    const initial = centeredCrop(width, height, aspect);
    setCrop(initial);
    // Seed completed pixel crop so Apply works without user interaction
    const pxW = (initial.width / 100) * width;
    const pxH = (initial.height / 100) * height;
    const pxX = (initial.x / 100) * width;
    const pxY = (initial.y / 100) * height;
    setCompleted({ unit: "px", x: pxX, y: pxY, width: pxW, height: pxH });
  }, [aspect]);

  const apply = async () => {
    if (!imgRef.current) return;
    if (!completed || !completed.width || !completed.height) {
      return;
    }
    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const canvas = document.createElement("canvas");
    canvas.width = completed.width * scaleX;
    canvas.height = completed.height * scaleY;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      img,
      completed.x * scaleX, completed.y * scaleY,
      completed.width * scaleX, completed.height * scaleY,
      0, 0, canvas.width, canvas.height
    );
    canvas.toBlob((blob) => {
      if (blob) {
        onCropped(blob);
        onOpenChange(false);
      }
    }, "image/jpeg", 0.92);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Crop Photo</DialogTitle></DialogHeader>
        <div className="flex justify-center bg-secondary/50 rounded-lg p-2">
          {imageSrc && (
            <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompleted(c)} aspect={aspect} circularCrop>
              <img ref={imgRef} src={imageSrc} onLoad={onLoad} alt="To crop" crossOrigin="anonymous" className="max-h-[60vh]" />
            </ReactCrop>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={apply}>Apply Crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoCropper;
