# Fourier Demo

An interactive Fourier series playground built with [Next.js](https://nextjs.org/), React, TypeScript, and Tailwind CSS. The app visualizes how periodic signals can be reconstructed from sinusoidal components using animated epicycles, waveform plots, and a live frequency spectrum.

## What it does

This project lets you explore Fourier series in a more visual, hands-on way. You can switch between classic preset waveforms like square, triangle, and sawtooth waves, or build your own custom periodic signal term by term.

The interface updates in real time as you change harmonics, amplitudes, basis functions, phase offsets, and period length. That makes it useful both as a learning tool and as a small demo of interactive mathematical visualization on the web.

## Features

- Animated epicycle view showing how rotating vectors sum into the final signal
- Waveform panel with approximation, target wave, and component-wave overlays
- Frequency spectrum view for inspecting dominant harmonics and overall energy
- Built-in preset series for square, triangle, and sawtooth waves
- Custom series editor with per-term amplitude, harmonic, basis, and phase controls
- Text-based Fourier expression input for supported series forms
- Import/export support for custom series definitions
- Saved custom-series slots persisted in local storage

## Tech stack

- `Next.js` App Router
- `React`
- `TypeScript`
- `Tailwind CSS`
- `SVG`-based data visualization and animation

## Running locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project structure

- `app/` contains the Next.js app shell and page entrypoints
- `components/fourier/` contains the interactive UI and visualization panels
- `lib/` contains Fourier math, parsing helpers, and animation utilities
- `types/` contains shared TypeScript types

## Why this project exists

Fourier series are often introduced through static formulas, but the intuition becomes much clearer when you can watch the partial sums evolve over time. This demo is meant to make that process tangible by connecting the equation, the rotating vectors, the waveform, and the harmonic spectrum in one place.
