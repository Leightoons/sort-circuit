/**
 * Algorithm Execution Engine
 * This module handles the step-by-step execution of sorting algorithms
 */

// Helper function to sleep for a given number of milliseconds
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Base class for all sorting algorithms
class SortingAlgorithm {
  constructor(dataset, stepSpeed = 500) {
    this.dataset = [...dataset]; // Clone the array to avoid modifying the original
    this.stepSpeed = stepSpeed;
    this.comparisons = 0;
    this.swaps = 0;
    this.finished = false;
    this.lastOperation = null;
    this.isRunning = false;
    this.currentStep = 0;
  }

  // Async method to sort the array
  async sort() {
    throw new Error('Sort method must be implemented by subclasses');
  }

  // Main method to run the algorithm
  async run() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    try {
      await this.sort();
    } catch (error) {
      console.error('Error running sort algorithm:', error);
    } finally {
      this.isRunning = false;
      this.finished = true;
    }
    
    return this.dataset;
  }
  
  // Method to pause the execution - can be implemented if needed
  pause() {
    this.isRunning = false;
  }
  
  // Method to resume the execution - can be implemented if needed
  async resume() {
    if (!this.finished && !this.isRunning) {
      await this.run();
    }
  }

  // Method to get current state
  getState() {
    return {
      dataset: [...this.dataset],
      comparisons: this.comparisons,
      swaps: this.swaps,
      currentStep: this.currentStep,
      finished: this.finished,
      lastOperation: this.lastOperation,
      isRunning: this.isRunning
    };
  }

  // Async helper method to perform a comparison
  async compare(i, j) {
    this.comparisons++;
    this.currentStep++;
    this.lastOperation = {
      type: 'comparison',
      indices: [i, j],
      values: [this.dataset[i], this.dataset[j]]
    };
    
    // Wait for visualization delay
    await sleep(this.stepSpeed);
    
    return this.dataset[i] > this.dataset[j];
  }

  // Async helper method to perform a swap
  async swap(i, j) {
    this.swaps++;
    this.currentStep++;
    this.lastOperation = {
      type: 'swap',
      indices: [i, j],
      values: [this.dataset[i], this.dataset[j]]
    };
    
    var temp = this.dataset[i];
    this.dataset[i] = this.dataset[j];
    this.dataset[j] = temp;
    
    // Wait for visualization delay
    await sleep(this.stepSpeed);
  }
}

// BubbleSort implementation
class BubbleSort extends SortingAlgorithm {
  async sort() {
    const n = this.dataset.length;
    
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      
      for (let j = 0; j < n - i - 1; j++) {
        // Compare adjacent elements
        const shouldSwap = await this.compare(j, j + 1);
        
        // Swap if needed
        if (shouldSwap) {
          await this.swap(j, j + 1);
          swapped = true;
        }
      }
      
      // If no swapping occurred in this pass, array is sorted
      if (!swapped) break;
    }
  }
}

// QuickSort implementation
class QuickSort extends SortingAlgorithm {
  async sort() {
    await this.quickSort(0, this.dataset.length - 1);
  }
  
  async quickSort(low, high) {
    if (low < high) {
      // Partition the array and get the pivot index
      const pivotIndex = await this.partition(low, high);
      
      // Recursively sort the sub-arrays
      await this.quickSort(low, pivotIndex - 1);
      await this.quickSort(pivotIndex + 1, high);
    }
  }
  
  async partition(low, high) {
    // Choose the rightmost element as pivot
    const pivot = this.dataset[high];
    let i = low - 1;
    
    // Compare all elements with the pivot
    for (let j = low; j < high; j++) {
      // Compare current element with pivot
      await this.compare(j, high);
      
      // If current element is less than pivot
      if (this.dataset[j] < pivot) {
        i++;
        // Swap elements at i and j
        await this.swap(i, j);
      }
    }
    
    // Place pivot in its final position
    await this.swap(i + 1, high);
    return i + 1;
  }
}

// MergeSort implementation
class MergeSort extends SortingAlgorithm {
  constructor(dataset, stepSpeed) {
    super(dataset, stepSpeed);
    this.auxiliaryArray = [...dataset];
  }
  
  async sort() {
    await this.mergeSort(0, this.dataset.length - 1);
  }
  
  async mergeSort(left, right) {
    if (left < right) {
      const mid = Math.floor((left + right) / 2);
      
      // Sort first and second halves
      await this.mergeSort(left, mid);
      await this.mergeSort(mid + 1, right);
      
      // Merge the sorted halves
      await this.merge(left, mid, right);
    }
  }
  
  async merge(left, mid, right) {
    // Copy data to auxiliary arrays
    for (let i = left; i <= right; i++) {
      this.auxiliaryArray[i] = this.dataset[i];
      
      // Visualize the copying
      this.currentStep++;
      this.lastOperation = {
        type: 'copy',
        indices: [i, i],
        values: [this.dataset[i], this.auxiliaryArray[i]]
      };
      await sleep(this.stepSpeed);
    }
    
    let i = left; // Initial index of first subarray
    let j = mid + 1; // Initial index of second subarray
    let k = left; // Initial index of merged subarray
    
    // Merge the arrays
    while (i <= mid && j <= right) {
      // Compare elements from both subarrays
      const result = await this.compare(i, j);
      
      if (!result) {
        // Element from left subarray is smaller
        this.dataset[k] = this.auxiliaryArray[i];
        i++;
      } else {
        // Element from right subarray is smaller
        this.dataset[k] = this.auxiliaryArray[j];
        j++;
      }
      
      // Visualize the placement
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, k],
        values: [this.dataset[k], this.auxiliaryArray[i-1]]
      };
      await sleep(this.stepSpeed);
      
      k++;
    }
    
    // Copy the remaining elements of left subarray, if any
    while (i <= mid) {
      this.dataset[k] = this.auxiliaryArray[i];
      
      // Visualize the copy
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, i],
        values: [this.dataset[k], this.auxiliaryArray[i]]
      };
      await sleep(this.stepSpeed);
      
      i++;
      k++;
    }
    
    // Copy the remaining elements of right subarray, if any
    while (j <= right) {
      this.dataset[k] = this.auxiliaryArray[j];
      
      // Visualize the copy
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, j],
        values: [this.dataset[k], this.auxiliaryArray[j]]
      };
      await sleep(this.stepSpeed);
      
      j++;
      k++;
    }
  }
}

// InsertionSort implementation
class InsertionSort extends SortingAlgorithm {
  async sort() {
    const n = this.dataset.length;
    
    for (let i = 1; i < n; i++) {
      const key = this.dataset[i];
      let j = i - 1;
      
      // Compare with key element
      await this.compare(i, i);
      
      // Move elements greater than key
      // to one position ahead of their current position
      while (j >= 0) {
        // Compare with current element
        await this.compare(j, i);
        
        if (this.dataset[j] > key) {
          // Shift element to the right
          this.dataset[j + 1] = this.dataset[j];
          
          // Visualize the shift
          this.swaps++;
          this.currentStep++;
          this.lastOperation = {
            type: 'swap',
            indices: [j, j + 1],
            values: [this.dataset[j], this.dataset[j]]
          };
          await sleep(this.stepSpeed);
          
          j--;
        } else {
          break;
        }
      }
      
      // Insert the key at the correct position
      if (this.dataset[j + 1] !== key) {
        const oldValue = this.dataset[j + 1];
        this.dataset[j + 1] = key;
        
        // Visualize the insertion
        this.swaps++;
        this.currentStep++;
        this.lastOperation = {
          type: 'swap',
          indices: [j + 1, i],
          values: [oldValue, key]
        };
        await sleep(this.stepSpeed);
      }
    }
  }
}

// SelectionSort implementation
class SelectionSort extends SortingAlgorithm {
  async sort() {
    const n = this.dataset.length;
    
    for (let i = 0; i < n - 1; i++) {
      // Assume the current index has the minimum value
      let minIndex = i;
      
      // Find the minimum element in the unsorted part of the array
      for (let j = i + 1; j < n; j++) {
        // Compare current element with current minimum
        const result = await this.compare(minIndex, j);
        
        // If j element is smaller than current minimum
        if (result) {
          minIndex = j;
        }
      }
      
      // Swap the found minimum element with the first element
      if (minIndex !== i) {
        await this.swap(i, minIndex);
      } else {
        // Even if no swap is needed, show a comparison for visualization purposes
        await this.compare(i, i);
      }
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
  generateDataset,
  sleep
}; 