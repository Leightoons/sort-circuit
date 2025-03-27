/**
 * Algorithm Execution Engine
 * This module handles the step-by-step execution of sorting algorithms
 */

// Base class for all sorting algorithms
class SortingAlgorithm {
  constructor(dataset, stepSpeed = 500) {
    this.dataset = [...dataset]; // Clone the array to avoid modifying the original
    this.stepSpeed = stepSpeed;
    this.currentStep = 0;
    this.comparisons = 0;
    this.swaps = 0;
    this.finished = false;
    this.lastOperation = null;
  }

  // Method to perform one step of the algorithm
  step() {
    throw new Error('Step method must be implemented by subclasses');
  }

  // Method to get current state
  getState() {
    return {
      dataset: [...this.dataset],
      comparisons: this.comparisons,
      swaps: this.swaps,
      currentStep: this.currentStep,
      finished: this.finished,
      lastOperation: this.lastOperation
    };
  }

  // Helper method to perform a comparison
  compare(i, j) {
    this.comparisons++;
    this.lastOperation = {
      type: 'comparison',
      indices: [i, j],
      values: [this.dataset[i], this.dataset[j]]
    };
    return this.dataset[i] > this.dataset[j];
  }

  // Helper method to perform a swap
  swap(i, j) {
    this.swaps++;
    this.lastOperation = {
      type: 'swap',
      indices: [i, j],
      values: [this.dataset[i], this.dataset[j]]
    };
    [this.dataset[i], this.dataset[j]] = [this.dataset[j], this.dataset[i]];
  }
}

// Bubble Sort implementation
class BubbleSort extends SortingAlgorithm {
  constructor(dataset, stepSpeed) {
    super(dataset, stepSpeed);
    this.i = 0;
    this.j = 0;
    this.swapped = false;
  }

  step() {
    if (this.finished) return;
    
    this.currentStep++;
    
    if (this.j >= this.dataset.length - this.i - 1) {
      if (!this.swapped) {
        this.finished = true;
        return;
      }
      this.i++;
      this.j = 0;
      this.swapped = false;
    }
    
    if (this.compare(this.j, this.j + 1)) {
      this.swap(this.j, this.j + 1);
      this.swapped = true;
    }
    
    this.j++;
  }
}

// Quick Sort implementation
class QuickSort extends SortingAlgorithm {
  constructor(dataset, stepSpeed) {
    super(dataset, stepSpeed);
    this.stack = [[0, dataset.length - 1]];
    this.pivotIndex = null;
    this.left = null;
    this.right = null;
    this.i = null;
    this.j = null;
    this.state = 'start';
    this.hasCompared = false;
  }

  step() {
    if (this.finished) return;
    
    this.currentStep++;
    
    if (this.stack.length === 0) {
      this.finished = true;
      return;
    }
    
    // Initialize a new partition
    if (this.state === 'start') {
      [this.left, this.right] = this.stack.pop();
      
      if (this.left >= this.right) {
        this.state = 'start';
        return;
      }
      
      this.pivotIndex = this.right;
      this.i = this.left - 1;
      this.j = this.left;
      this.state = 'compare';
      this.hasCompared = false;
      return;
    }
    
    // Compare current element with pivot
    if (this.state === 'compare') {
      if (this.j < this.right) {
        if (!this.hasCompared) {
          // Perform comparison first
          this.compare(this.pivotIndex, this.j);
          this.hasCompared = true;
          return;
        } else {
          // Then, based on the comparison, maybe do a swap
          if (this.lastOperation && this.lastOperation.type === 'comparison') {
            const shouldSwap = this.dataset[this.j] < this.dataset[this.pivotIndex];
            if (shouldSwap) {
              this.i++;
              this.state = 'swap';
              return;
            } else {
              // No swap needed, move to next element
              this.j++;
              this.hasCompared = false;
              return;
            }
          }
        }
      } else {
        // Done with all elements, time to place pivot
        this.i++;
        this.state = 'place-pivot';
        return;
      }
    }
    
    // Swap elements
    if (this.state === 'swap') {
      this.swap(this.i, this.j);
      this.j++;
      this.state = 'compare';
      this.hasCompared = false;
      return;
    }
    
    // Place pivot in its final position
    if (this.state === 'place-pivot') {
      this.swap(this.i, this.pivotIndex);
      this.state = 'push-subarrays';
      return;
    }
    
    // Push subarrays for further processing
    if (this.state === 'push-subarrays') {
      this.stack.push([this.left, this.i - 1]);
      this.stack.push([this.i + 1, this.right]);
      this.state = 'start';
      return;
    }
  }
}

// Merge Sort implementation
class MergeSort extends SortingAlgorithm {
  constructor(dataset, stepSpeed) {
    super(dataset, stepSpeed);
    this.auxiliaryArray = [...dataset];
    this.size = 1;
    this.leftStart = 0;
    this.leftEnd = 0;
    this.rightStart = 0;
    this.rightEnd = 0;
    this.left = 0;
    this.right = 0;
    this.index = 0;
    this.state = 'start';
    this.subState = null;
    this.copyIndex = -1;
  }

  step() {
    if (this.finished) return;
    
    this.currentStep++;
    
    if (this.size >= this.dataset.length) {
      this.finished = true;
      return;
    }
    
    // Setup merge operation
    if (this.state === 'start') {
      this.leftStart = 0;
      this.state = 'setup';
      return;
    }
    
    // Configure the merge operation
    if (this.state === 'setup') {
      this.leftEnd = Math.min(this.leftStart + this.size - 1, this.dataset.length - 1);
      this.rightStart = this.leftEnd + 1;
      this.rightEnd = Math.min(this.rightStart + this.size - 1, this.dataset.length - 1);
      
      // Initialize indices for the merge
      this.left = this.leftStart;
      this.right = this.rightStart;
      this.index = this.leftStart;
      
      this.state = 'compare';
      return;
    }
    
    // Compare values from both subarrays
    if (this.state === 'compare') {
      if (this.left <= this.leftEnd && this.right <= this.rightEnd) {
        // Perform one comparison
        this.comparisons++;
        this.lastOperation = {
          type: 'comparison',
          indices: [this.left, this.right],
          values: [this.dataset[this.left], this.dataset[this.right]]
        };
        
        if (this.dataset[this.left] <= this.dataset[this.right]) {
          this.auxiliaryArray[this.index] = this.dataset[this.left];
          this.left++;
        } else {
          this.auxiliaryArray[this.index] = this.dataset[this.right];
          this.right++;
        }
        this.index++;
        return;
      } else if (this.left <= this.leftEnd) {
        this.state = 'copy-left';
        return;
      } else if (this.right <= this.rightEnd) {
        this.state = 'copy-right';
        return;
      } else {
        this.state = 'copy-back';
        this.copyIndex = this.leftStart;
        return;
      }
    }
    
    // Copy remaining left elements
    if (this.state === 'copy-left') {
      this.auxiliaryArray[this.index] = this.dataset[this.left];
      this.left++;
      this.index++;
      
      if (this.left > this.leftEnd) {
        this.state = this.right <= this.rightEnd ? 'copy-right' : 'copy-back';
        this.copyIndex = this.leftStart;
      }
      return;
    }
    
    // Copy remaining right elements
    if (this.state === 'copy-right') {
      this.auxiliaryArray[this.index] = this.dataset[this.right];
      this.right++;
      this.index++;
      
      if (this.right > this.rightEnd) {
        this.state = 'copy-back';
        this.copyIndex = this.leftStart;
      }
      return;
    }
    
    // Copy from auxiliary array back to main array
    if (this.state === 'copy-back') {
      if (this.copyIndex <= this.rightEnd) {
        this.dataset[this.copyIndex] = this.auxiliaryArray[this.copyIndex];
        this.swaps++;
        this.lastOperation = {
          type: 'swap',
          indices: [this.copyIndex, this.copyIndex],
          values: [null, this.dataset[this.copyIndex]]
        };
        this.copyIndex++;
        return;
      } else {
        this.leftStart = this.rightEnd + 1;
        
        if (this.leftStart >= this.dataset.length) {
          this.size *= 2;
          this.state = 'start';
        } else {
          this.state = 'setup';
        }
      }
    }
  }
}

// Insertion Sort implementation
class InsertionSort extends SortingAlgorithm {
  constructor(dataset, stepSpeed) {
    super(dataset, stepSpeed);
    this.i = 1;
    this.j = null;
    this.key = null;
    this.state = 'start';
    this.hasCompared = false;
  }

  step() {
    if (this.finished) return;
    
    this.currentStep++;
    
    if (this.i >= this.dataset.length) {
      this.finished = true;
      return;
    }
    
    // Select the key (current element to insert)
    if (this.state === 'start') {
      this.key = this.dataset[this.i];
      this.j = this.i - 1;
      this.state = 'compare';
      this.hasCompared = false;
      return;
    }
    
    // Compare current element
    if (this.state === 'compare') {
      if (this.j >= 0) {
        if (!this.hasCompared) {
          // Perform one comparison
          this.comparisons++;
          this.lastOperation = {
            type: 'comparison',
            indices: [this.j, this.i],
            values: [this.dataset[this.j], this.key]
          };
          this.hasCompared = true;
          return;
        } else {
          // After comparison, decide what to do
          if (this.dataset[this.j] > this.key) {
            this.state = 'shift';
            return;
          } else {
            this.state = 'insert';
            return;
          }
        }
      } else {
        this.state = 'insert';
        return;
      }
    }
    
    // Shift one element
    if (this.state === 'shift') {
      this.dataset[this.j + 1] = this.dataset[this.j];
      this.swaps++;
      this.lastOperation = {
        type: 'swap',
        indices: [this.j, this.j + 1],
        values: [this.dataset[this.j], this.dataset[this.j]]
      };
      this.j--;
      this.state = 'compare';
      this.hasCompared = false;
      return;
    }
    
    // Insert the key
    if (this.state === 'insert') {
      this.dataset[this.j + 1] = this.key;
      this.swaps++;
      this.lastOperation = {
        type: 'swap',
        indices: [this.j + 1, -1],
        values: [null, this.key]
      };
      this.i++;
      this.state = 'start';
      return;
    }
  }
}

// Selection Sort implementation
class SelectionSort extends SortingAlgorithm {
  constructor(dataset, stepSpeed) {
    super(dataset, stepSpeed);
    this.i = 0;
    this.j = 1;
    this.minIndex = 0;
  }

  step() {
    if (this.finished) return;
    
    this.currentStep++;
    
    if (this.i >= this.dataset.length - 1) {
      this.finished = true;
      return;
    }
    
    if (this.j === this.i) {
      this.minIndex = this.i;
      this.j = this.i + 1;
    }
    
    if (this.j < this.dataset.length) {
      if (this.compare(this.minIndex, this.j)) {
        this.minIndex = this.j;
      }
      this.j++;
    } else {
      if (this.minIndex !== this.i) {
        this.swap(this.i, this.minIndex);
      }
      this.i++;
      this.minIndex = this.i;
      this.j = this.i + 1;
    }
  }
}

// Factory function to create appropriate algorithm instance
const createAlgorithm = (type, dataset, stepSpeed) => {
  switch (type.toLowerCase()) {
    case 'bubble':
      return new BubbleSort(dataset, stepSpeed);
    case 'quick':
      return new QuickSort(dataset, stepSpeed);
    case 'merge':
      return new MergeSort(dataset, stepSpeed);
    case 'insertion':
      return new InsertionSort(dataset, stepSpeed);
    case 'selection':
      return new SelectionSort(dataset, stepSpeed);
    default:
      throw new Error(`Unknown algorithm type: ${type}`);
  }
};

// Function to generate a random dataset
const generateDataset = (size, min = 1, max = 100, allowDuplicates = false) => {
  const dataset = [];
  
  if (allowDuplicates) {
    for (let i = 0; i < size; i++) {
      dataset.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
  } else {
    // Ensure no duplicates by creating a set of possible values and sampling from it
    const possibleValues = new Set();
    for (let i = min; i <= max; i++) {
      possibleValues.add(i);
    }
    
    // Convert to array for random sampling
    const possibleValuesArray = Array.from(possibleValues);
    
    // Ensure we're not asking for more unique values than are available
    const actualSize = Math.min(size, possibleValuesArray.length);
    
    for (let i = 0; i < actualSize; i++) {
      const randomIndex = Math.floor(Math.random() * possibleValuesArray.length);
      dataset.push(possibleValuesArray[randomIndex]);
      possibleValuesArray.splice(randomIndex, 1);
    }
  }
  
  return dataset;
};

module.exports = {
  createAlgorithm,
  generateDataset
}; 