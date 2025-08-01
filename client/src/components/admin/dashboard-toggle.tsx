import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Layout, RotateCcw } from 'lucide-react';

interface DashboardToggleProps {
  onToggleEnhanced: () => void;
  isEnhanced: boolean;
}

export function DashboardToggle({ onToggleEnhanced, isEnhanced }: DashboardToggleProps) {
  return (
    <Card className="fixed top-4 right-4 z-50 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Dashboard Design:</span>
          </div>
          
          <Button
            onClick={onToggleEnhanced}
            variant={isEnhanced ? "default" : "outline"}
            size="sm"
            className={`text-xs ${
              isEnhanced 
                ? "bg-purple-600 hover:bg-purple-700 text-white" 
                : "border-purple-200 text-purple-600 hover:bg-purple-50"
            }`}
          >
            {isEnhanced ? (
              <>
                <Layout className="w-3 h-3 mr-1" />
                Enhanced
              </>
            ) : (
              <>
                <RotateCcw className="w-3 h-3 mr-1" />
                Original
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}