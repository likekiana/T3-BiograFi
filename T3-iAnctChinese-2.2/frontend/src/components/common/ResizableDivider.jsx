import React, { useState, useCallback, useEffect } from 'react';
import '../../styles/components/ResizableDivider.css';

const ResizableDivider = ({ 
  leftMinWidth = 300, 
  rightMinWidth = 300,
  defaultLeftWidth = 50 
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const container = document.querySelector('.editor-content');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;
    
    const newLeftWidthPx = mouseX;
    const newRightWidthPx = containerWidth - mouseX;

    if (newLeftWidthPx >= leftMinWidth && newRightWidthPx >= rightMinWidth) {
      const newLeftWidthPercent = (mouseX / containerWidth) * 100;
      setLeftWidth(newLeftWidthPercent);
    }
  }, [isDragging, leftMinWidth, rightMinWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    leftWidth,
    dividerProps: {
      onMouseDown: handleMouseDown,
      className: `resizable-divider ${isDragging ? 'dragging' : ''}`
    }
  };
};

export default ResizableDivider;
