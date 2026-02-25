// observable-notebook-widget.js

import {Runtime, Inspector} from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js";

// Load the Observable Runtime CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://cdn.jsdelivr.net/npm/@observablehq/inspector@5/dist/inspector.css';
document.head.appendChild(link);

export default {
  async initialize({ model }) {
    return () => {};
  },

  async render({ model, el }) {
    
    // Get parameters from the model
    const notebookUrl = model.get("notebook");
    const cells = model.get("cells"); // Optional: specific cells to render
    const dependencies = model.get("dependencies"); // Optional: cells to evaluate but not display
    const height = model.get("height");
    const width = model.get("width");
    
    if (!notebookUrl) {
      el.innerHTML = '<p style="color: red;">Error: No notebook URL provided</p>';
      return () => {};
    }

    // Create container for the notebook
    const container = document.createElement('div');
    container.className = 'observable-notebook-container';
    
    if (height) {
      container.style.height = height;
    }
    if (width) {
      container.style.width = width;
    }
    
    el.appendChild(container);

    try {
      // Dynamically import the notebook definition
      const notebookModule = await import(notebookUrl);
      const define = notebookModule.default;
      
      // Create runtime and render
      const runtime = new Runtime();
      
      if (cells && Array.isArray(cells)) {
        // Render specific cells
        const cellContainers = new Map();
        
        // Create containers for each cell to display
        cells.forEach((cellName, index) => {
          const cellContainer = document.createElement('div');
          cellContainer.id = `observable-cell-${index}`;
          cellContainer.className = 'observable-cell';
          container.appendChild(cellContainer);
          cellContainers.set(cellName, cellContainer);
        });
        
        // Set up the module with proper cell handling
        runtime.module(define, name => {
          // If this cell should be displayed, return an Inspector
          if (cellContainers.has(name)) {
            return new Inspector(cellContainers.get(name));
          }
          // If this cell is a dependency, evaluate it but don't display
          if (dependencies && Array.isArray(dependencies) && dependencies.includes(name)) {
            return true;
          }
          // Otherwise, don't evaluate this cell
          return undefined;
        });
      } else {
        // Render entire notebook
        runtime.module(define, Inspector.into(container));
      }
      
      // Cleanup function
      return () => {
        runtime.dispose();
      };
      
    } catch (error) {
      console.error('Error loading Observable notebook:', error);
      el.innerHTML = `<p style="color: red;">Error loading notebook: ${error.message}</p>`;
      return () => {};
    }
  }
};