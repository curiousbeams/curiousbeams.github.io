// observable-notebook-widget.js

import {Runtime, Inspector} from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js";

const INSPECTOR_CSS = "https://cdn.jsdelivr.net/npm/@observablehq/inspector@5/dist/inspector.css";

// The inspector's stylesheet has to go inside `el`, not into document.head: the
// {anywidget} renderer always mounts the widget in a shadow root, and a shadow
// tree does not see the document's stylesheets. Injecting it per render rather
// than once at module load is also what makes it arrive at all — the module is
// evaluated once and shared by every widget on the page.
function addInspectorStyles(el) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = INSPECTOR_CSS;
  el.appendChild(link);
  return link;
}

/** An error the reader can see, rather than an empty gap in the page. */
function errorNote(message) {
  const p = document.createElement('p');
  p.style.color = 'var(--myst-color-error, #b91c1c)';
  p.style.font = '13px ui-monospace, Menlo, Consolas, monospace';
  p.textContent = message;
  return p;
}

export default {
  async render({ model, el }) {
    const styles = addInspectorStyles(el);

    // Get parameters from the model
    const notebookUrl = model.get("notebook");
    const cells = model.get("cells"); // Optional: specific cells to render
    const dependencies = model.get("dependencies"); // Optional: cells to evaluate but not display
    const overrides = model.get("overrides"); // Optional: object with cell values to override
    const height = model.get("height");
    const width = model.get("width");
    
    if (!notebookUrl) {
      el.appendChild(errorNote('No notebook URL provided.'));
      return () => styles.remove();
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
        
        // Create a main module from the notebook definition
        const main = runtime.module(define, name => {
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
        
        // Function to apply overrides
        const applyOverrides = () => {
          if (overrides && typeof overrides === 'object') {
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            
            for (const [cellName, value] of Object.entries(overrides)) {
              let resolvedValue = value;
              
              // If the value is a string starting with "=", evaluate it as an expression
              if (typeof value === 'string' && value.startsWith('=')) {
                try {
                  // Create a safe evaluation context with width and height
                  const expr = value.substring(1);
                  resolvedValue = Function('width', 'height', `return ${expr}`)(containerWidth, containerHeight);
                } catch (e) {
                  console.error(`Error evaluating override expression "${value}":`, e);
                  resolvedValue = value;
                }
              }
              
              main.redefine(cellName, resolvedValue);
            }
          }
        };
        
        // Apply overrides initially
        applyOverrides();
        
        // Set up resize observer to reapply overrides on container resize
        const resizeObserver = new ResizeObserver(() => {
          applyOverrides();
        });
        resizeObserver.observe(container);
        
        // Update cleanup to disconnect observer
        const originalCleanup = () => {
          runtime.dispose();
        };
        
        return () => {
          resizeObserver.disconnect();
          originalCleanup();
          container.remove();
          styles.remove();
        };
      } else {
        // Render entire notebook
        runtime.module(define, Inspector.into(container));
        
        return () => {
          runtime.dispose();
          container.remove();
          styles.remove();
        };
      }
            
    } catch (error) {
      console.error('Error loading Observable notebook:', error);
      container.appendChild(errorNote(`Error loading notebook: ${error.message}`));
      return () => {
        container.remove();
        styles.remove();
      };
    }
  }
};