import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Maximize2, Minimize2, Move } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  resizable?: boolean;
  draggable?: boolean;
}

export function FloatingSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  defaultPosition = { x: 50, y: 50 },
  defaultSize = { width: 400, height: 500 },
  minSize = { width: 320, height: 400 },
  maxSize = { width: window.innerWidth - 40, height: window.innerHeight - 40 },
  resizable = true,
  draggable = true,
}: FloatingSheetProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Ensure sheet stays within viewport bounds
  useEffect(() => {
    if (!isOpen) return;

    const constrainPosition = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      setPosition(prev => ({
        x: Math.max(0, Math.min(prev.x, viewportWidth - size.width)),
        y: Math.max(0, Math.min(prev.y, viewportHeight - size.height))
      }));
    };

    constrainPosition();
    window.addEventListener('resize', constrainPosition);
    return () => window.removeEventListener('resize', constrainPosition);
  }, [isOpen, size]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && draggable) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset]);

  const handleMaximize = () => {
    if (isMaximized) {
      setSize(defaultSize);
      setPosition(defaultPosition);
      setIsMaximized(false);
    } else {
      setSize({
        width: window.innerWidth - 40,
        height: window.innerHeight - 40
      });
      setPosition({ x: 20, y: 20 });
      setIsMaximized(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed z-50 bg-background border border-border rounded-lg shadow-xl",
        isDragging && "cursor-grabbing",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        minWidth: minSize.width,
        minHeight: minSize.height,
        maxWidth: maxSize.width,
        maxHeight: maxSize.height,
      }}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-3 border-b bg-muted/50 rounded-t-lg",
          draggable && "cursor-grab active:cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Move className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold truncate">{title}</h3>
        </div>
        
        <div className="flex items-center gap-1">
          {resizable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMaximize}
              className="h-6 w-6 p-0"
            >
              {isMaximized ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100%-49px)]">
        <div className="p-4">
          {children}
        </div>
      </ScrollArea>

      {/* Resize handle */}
      {resizable && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-muted hover:bg-muted-foreground/20 transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
            setDragOffset({
              x: e.clientX - size.width,
              y: e.clientY - size.height
            });
          }}
        >
          <div className="absolute bottom-1 right-1 w-0 h-0 border-l-2 border-b-2 border-muted-foreground/40" />
        </div>
      )}
    </div>
  );
}