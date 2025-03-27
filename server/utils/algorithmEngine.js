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
    this.state = 'start';
  }

  step() {
    if (this.finished) return;
    
    this.currentStep++;
    
    if (this.stack.length === 0) {
      this.finished = true;
      return;
    }
    
    if (this.state === 'start') {
      [this.left, this.right] = this.stack.pop();
      
      if (this.left >= this.right) {
        this.state = 'start';
        return;
      }
      
      this.pivotIndex = this.right;
      this.i = this.left - 1;
      this.j = this.left;
      this.state = 'partition';
    }
    
    if (this.state === 'partition') {
      if (this.j < this.right) {
        if (this.compare(this.pivotIndex, this.j)) {
          this.i++;
          this.swap(this.i, this.j);
        }
        this.j++;
      } else {
        this.i++;
        this.swap(this.i, this.pivotIndex);
        this.stack.push([this.left, this.i - 1]);
        this.stack.push([this.i + 1, this.right]);
        this.state = 'start';
      }
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
    this.state = 'start';
  }

  step() {
    if (this.finished) return;
    
    this.currentStep++;
    
    if (this.size >= this.dataset.length) {
      this.finished = true;
      return;
    }
    
    if (this.state === 'start') {
      this.leftStart = 0;
      this.state = 'merge';
    }
    
    if (this.state === 'merge') {
      const leftEnd = Math.min(this.leftStart + this.size - 1, this.dataset.length - 1);
      const rightStart = leftEnd + 1;
      const rightEnd = Math.min(rightStart + this.size - 1, this.dataset.length - 1);
      
      // Merge the two subarrays
      let left = this.leftStart;
      let right = rightStart;
      let index = this.leftStart;
      
      while (left <= leftEnd && right <= rightEnd) {
        this.comparisons++;
        this.lastOperation = {
          type: 'comparison',
          indices: [left, right],
          values: [this.dataset[left], this.dataset[right]]
        };
        
        if (this.dataset[left] <= this.dataset[right]) {
          this.auxiliaryArray[index] = this.dataset[left];
          left++;
        } else {
          this.auxiliaryArray[index] = this.dataset[right];
          right++;
        }
        index++;
      }
      
      while (left <= leftEnd) {
        this.auxiliaryArray[index] = this.dataset[left];
        left++;
        index++;
      }
      
      while (right <= rightEnd) {
        this.auxiliaryArray[index] = this.dataset[right];
        right++;
        index++;
      }
      
      // Copy back
      for (let i = this.leftStart; i <= rightEnd; i++) {
        this.dataset[i] = this.auxiliaryArray[i];
        this.swaps++;
        this.lastOperation = {
          type: 'swap',
          indices: [i, i],
          values: [null, this.dataset[i]] // The old value is replaced
        };
      }
      
      this.leftStart = rightEnd + 1;
      
      if (this.leftStart >= this.dataset.length) {
        this.size *= 2;
        this.state = 'start';
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
  }

  step() {
    if (this.finished) return;
    
    this.currentStep++;
    
    if (this.i >= this.dataset.length) {
      this.finished = true;
      return;
    }
    
    if (this.state === 'start') {
      this.key = this.dataset[this.i];
      this.j = this.i - 1;
      this.state = 'shift';
    }
    
    if (this.state === 'shift') {
      if (this.j >= 0) {
        this.comparisons++;
        this.lastOperation = {
          type: 'comparison',
          indices: [this.j, this.i],
          values: [this.dataset[this.j], this.key]
        };
        
        if (this.dataset[this.j] > this.key) {
          this.dataset[this.j + 1] = this.dataset[this.j];
          this.swaps++;
          this.lastOperation = {
            type: 'swap',
            indices: [this.j, this.j + 1],
            values: [this.dataset[this.j], this.dataset[this.j]]
          };
          this.j--;
        } else {
          this.state = 'insert';
        }
      } else {
        this.state = 'insert';
      }
    }
    
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