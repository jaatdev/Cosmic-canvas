// Stage.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Stage from '@/components/Canvas/Stage';

/**
 * Helper to get pixel data from canvas at given coordinates.
 */
function getPixelData(canvas: HTMLCanvasElement, x: number, y: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return ctx.getImageData(x, y, 1, 1).data;
}

describe('Stage Pressure Engine', () => {
    test('draws a black stroke on pen pointer events', () => {
        const { container } = render(<Stage />);
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        expect(canvas).toBeInTheDocument();

        // Simulate pen pointer down at (50,50)
        fireEvent.pointerDown(canvas, {
            clientX: 50,
            clientY: 50,
            pressure: 0.8,
            pointerType: 'pen',
            pointerId: 1,
        });

        // Move to create a line
        fireEvent.pointerMove(canvas, {
            clientX: 150,
            clientY: 150,
            pressure: 0.8,
            pointerType: 'pen',
            pointerId: 1,
        });

        // End drawing
        fireEvent.pointerUp(canvas, {
            clientX: 150,
            clientY: 150,
            pressure: 0.8,
            pointerType: 'pen',
            pointerId: 1,
        });

        // After drawing, a pixel along the line should be black (0,0,0)
        const pixel = getPixelData(canvas, 100, 100);
        expect(pixel).not.toBeNull();
        // Black pixel RGBA should be (0,0,0,255)
        expect(pixel![0]).toBe(0);
        expect(pixel![1]).toBe(0);
        expect(pixel![2]).toBe(0);
        expect(pixel![3]).toBe(255);
    });

    test('ignores touch input (palm rejection)', () => {
        const { container } = render(<Stage />);
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        expect(canvas).toBeInTheDocument();

        // Touch down should not start drawing
        fireEvent.pointerDown(canvas, {
            clientX: 30,
            clientY: 30,
            pressure: 0.5,
            pointerType: 'touch',
            pointerId: 2,
        });

        fireEvent.pointerMove(canvas, {
            clientX: 80,
            clientY: 80,
            pressure: 0.5,
            pointerType: 'touch',
            pointerId: 2,
        });

        fireEvent.pointerUp(canvas, {
            clientX: 80,
            clientY: 80,
            pressure: 0.5,
            pointerType: 'touch',
            pointerId: 2,
        });

        // Pixel where touch occurred should remain background color (dark grey #1e1e1e)
        const pixel = getPixelData(canvas, 50, 50);
        // Background color RGB approx (30,30,30)
        expect(pixel![0]).toBeCloseTo(30, 0);
        expect(pixel![1]).toBeCloseTo(30, 0);
        expect(pixel![2]).toBeCloseTo(30, 0);
    });
});
