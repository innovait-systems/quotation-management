'use client';

import { useEffect } from 'react';
import { useTenantStore } from '../store/tenantStore';

export default function TenantThemeInjector() {
  const { activeTenant } = useTenantStore();

  useEffect(() => {
    if (!activeTenant || !activeTenant.brandingConfig) return;

    const primaryColor = activeTenant.brandingConfig.primary || '#6366f1';
    const secondaryColor = activeTenant.brandingConfig.secondary || '#8b5cf6';

    // Helper to compute active hover shades (Darkened by ~12%)
    const darkenColor = (hex: string, percent: number): string => {
      let num = parseInt(hex.replace("#", ""), 16);
      const amt = Math.round(2.55 * percent);
      let R = (num >> 16) - amt;
      let G = ((num >> 8) & 0x00ff) - amt;
      let B = (num & 0x0000ff) - amt;
      
      R = R < 0 ? 0 : R > 255 ? 255 : R;
      G = G < 0 ? 0 : G > 255 ? 255 : G;
      B = B < 0 ? 0 : B > 255 ? 255 : B;

      return (
        "#" +
        (0x1000000 + R * 0x10000 + G * 0x100 + B)
          .toString(16)
          .slice(1)
      );
    };

    const hoverColor = darkenColor(primaryColor, 12);
    
    // Set root CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--primary-hover', hoverColor);
    root.style.setProperty('--secondary', secondaryColor);
    
    // Inject subtle shadow glow color variables (Alpha opacity 5%)
    root.style.setProperty('--shadow-color', `${primaryColor}0d`);
  }, [activeTenant]);

  return null;
}
