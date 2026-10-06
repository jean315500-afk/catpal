/// <reference types="vite/client" />

// <image-slot> is a custom element defined by public/image-slot.js.
declare namespace JSX {
  interface IntrinsicElements {
    'image-slot': {
      id?: string;
      src?: string;
      shape?: string;
      placeholder?: string;
      [attr: string]: unknown;
    };
  }
}
