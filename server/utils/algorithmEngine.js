/**
 * Algorithm Execution Engine
 * This module handles the step-by-step execution of sorting algorithms
 */

// Helper function to sleep for a given number of milliseconds
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Base class for all sorting algorithms
class SortingAlgorithm {
  constructor(dataset, stepSpeed = 250) {
    this.dataset = [...dataset]; // Clone the array to avoid modifying the original
    this.stepSpeed = stepSpeed;
    this.comparisons = 0;
    this.swaps = 0;
    this.arrayAccesses = 0; // Track array read operations
    this.arrayWrites = 0;   // Track array write operations
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
      arrayAccesses: this.arrayAccesses,
      arrayWrites: this.arrayWrites,
      currentStep: this.currentStep,
      finished: this.finished,
      lastOperation: this.lastOperation,
      isRunning: this.isRunning
    };
  }

  // Helper method to safely access array elements with tracking
  access(index) {
    this.arrayAccesses++;
    return this.dataset[index];
  }
  
  // Helper method to safely write to array elements with tracking
  write(index, value) {
    this.arrayWrites++;
    this.dataset[index] = value;
    return value;
  }

  // Async helper method to perform a comparison
  async compare(i, j) {
    this.comparisons++;
    this.arrayAccesses += 2; // Reading two array elements counts as two accesses
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
    this.arrayAccesses += 2; // Reading values counts as accesses
    this.arrayWrites += 2;   // Writing values counts as writes
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

/**
 * Bubble Sort
 * 
 * Simple comparison-based algorithm that repeatedly steps through the list,
 * compares adjacent elements, and swaps them if they are in the wrong order.
 */
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

/**
 * Quick Sort
 * 
 * Divide-and-conquer algorithm that selects a pivot element and partitions
 * the array around the pivot, placing smaller elements to the left and 
 * larger ones to the right.
 */
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

/**
 * In-Place Stable Sort
 * 
 * Advanced merge sort variant that works in-place without auxiliary storage.
 * Uses binary search and clever rotations to efficiently merge sorted sections.
 * Based on the algorithm from C++ STL library.
 */
class InPlaceStableSort extends SortingAlgorithm {
  async sort() {
    await this.stableSort(0, this.dataset.length);
  }
  
  // Find the first position where value is not less than array[index]
  async lowerBound(from, to, valueIndex) {
    let len = to - from;
    
    while (len > 0) {
      const half = Math.floor(len / 2);
      const mid = from + half;
      
      // Compare mid with valueIndex
      if (await this.compare(valueIndex, mid)) {
        // valueIndex > mid, so search in right half
        from = mid + 1;
        len = len - half - 1;
      } else {
        // valueIndex <= mid, so search in left half
        len = half;
      }
    }
    
    return from;
  }
  
  // Find the first position where value is less than array[index]
  async upperBound(from, to, valueIndex) {
    let len = to - from;
    
    while (len > 0) {
      const half = Math.floor(len / 2);
      const mid = from + half;
      
      // Compare valueIndex with mid
      if (await this.compare(mid, valueIndex)) {
        // mid > valueIndex, so search in left half
        len = half;
      } else {
        // mid <= valueIndex, so search in right half
        from = mid + 1;
        len = len - half - 1;
      }
    }
    
    return from;
  }
  
  // Insert sort for small arrays
  async insertSort(from, to) {
    if (to > from + 1) {
      for (let i = from + 1; i < to; i++) {
        for (let j = i; j > from; j--) {
          if (await this.compare(j - 1, j)) {
            // The compare method already counts accesses
            // But we need to count the actual swap operations
            this.arrayAccesses += 2; // Count two reads for the swap
            this.arrayWrites += 2;   // Count two writes for the swap
            await this.swap(j, j - 1);
          } else {
            break;
          }
        }
      }
    }
  }
  
  // Greatest common divisor
  gcd(m, n) {
    while (n !== 0) {
      const t = m % n;
      m = n;
      n = t;
    }
    return m;
  }
  
  // Reverse a subarray
  async reverse(from, to) {
    while (from < to) {
      await this.swap(from++, to--);
    }
  }
  
  // Rotate a subarray - moves elements from [from, mid) to after [mid, to)
  async rotate(from, mid, to) {
    if (from === mid || mid === to) return;
    
    // Use the algorithm from the reference site
    const n = this.gcd(to - from, mid - from);
    
    for (let i = 0; i < n; i++) {
      // Save the first element
      this.arrayAccesses++; // Count read for val
      const val = this.dataset[from + i];
      const shift = mid - from;
      
      let p1 = from + i;
      let p2 = from + i + shift;
      
      while (p2 !== from + i) {
        // Move p2 to p1
        this.arrayAccesses++; // Count read from p2
        this.arrayWrites++; // Count write to p1
        this.dataset[p1] = this.dataset[p2];
        
        // Visualize this operation
        this.swaps++;
        this.currentStep++;
        this.lastOperation = {
          type: 'swap',
          indices: [p1, p2],
          values: [this.dataset[p1], this.dataset[p2]]
        };
        await sleep(this.stepSpeed);
        
        p1 = p2;
        
        if (to - p2 > shift) {
          p2 += shift;
        } else {
          p2 = from + (shift - (to - p2));
        }
      }
      
      // Place the saved value
      this.arrayWrites++; // Count write to p1
      this.dataset[p1] = val;
      
      // Visualize this operation
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [p1, from + i],
        values: [this.dataset[p1], val]
      };
      await sleep(this.stepSpeed);
    }
  }
  
  // Merge two adjacent sorted subarrays
  async merge(from, pivot, to, len1, len2) {
    //await sleep(this.stepSpeed); // Visualize the recursive structure
    
    if (len1 === 0 || len2 === 0) return;
    
    if (len1 + len2 === 2) {
      if (await this.compare(from, pivot)) {
        await this.swap(from, pivot);
      }
      return;
    }
    
    let firstCut, secondCut;
    let len11, len22;
    
    if (len1 > len2) {
      len11 = Math.floor(len1 / 2);
      firstCut = from + len11;
      secondCut = await this.lowerBound(pivot, to, firstCut);
      len22 = secondCut - pivot;
    } else {
      len22 = Math.floor(len2 / 2);
      secondCut = pivot + len22;
      firstCut = await this.upperBound(from, pivot, secondCut);
      len11 = firstCut - from;
    }
    
    // Rotate to bring elements in order
    await this.rotate(firstCut, pivot, secondCut);
    
    const newMid = firstCut + len22;
    
    // Recursively merge the two halves
    await this.merge(from, firstCut, newMid, len11, len22);
    await this.merge(newMid, secondCut, to, len1 - len11, len2 - len22);
  }
  
  // Main sort function
  async stableSort(from, to) {
    await sleep(this.stepSpeed); // Visualize the recursive structure
    
    if (to - from < 12) {
      await this.insertSort(from, to);
      return;
    }
    
    const middle = Math.floor((from + to) / 2);
    
    // Sort the two halves
    await this.stableSort(from, middle);
    await this.stableSort(middle, to);
    
    // Merge the sorted halves
    await this.merge(from, middle, to, middle - from, to - middle);
  }
}

/**
 * Insertion Sort
 * 
 * Simple sorting algorithm that builds the final sorted array one item at a time.
 * Similar to how people sort playing cards in their hands.
 */
class InsertionSort extends SortingAlgorithm {
  async sort() {
    const n = this.dataset.length;
    
    for (let i = 1; i < n; i++) {
      this.arrayAccesses++; // Count access for reading key
      const key = this.dataset[i];
      let j = i - 1;
      
      // Compare with key element
      await this.compare(i, i);
      
      // Move elements greater than key
      // to one position ahead of their current position
      while (j >= 0) {
        // Compare with current element
        await this.compare(j, i);
        
        this.arrayAccesses++; // Count access for reading dataset[j]
        if (this.dataset[j] > key) {
          this.arrayAccesses++; // Count access for reading dataset[j]
          this.arrayWrites++; // Count write for dataset[j+1]
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
        this.arrayAccesses++; // Count access for reading dataset[j+1]
        this.arrayWrites++; // Count write for dataset[j+1]
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

/**
 * Selection Sort
 * 
 * Simple sorting algorithm that repeatedly finds the minimum element from the
 * unsorted portion and puts it at the beginning.
 */
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

/**
 * Heap Sort
 * 
 * Comparison-based sorting algorithm that uses a binary heap data structure.
 * It divides the input into a sorted and an unsorted region, and iteratively
 * shrinks the unsorted region by extracting the largest element and moving it
 * to the sorted region.
 */
class HeapSort extends SortingAlgorithm {
  async sort() {
    const n = this.dataset.length;
    
    // Build heap (rearrange array)
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      await this.heapify(n, i);
    }
    
    // One by one extract elements from heap
    for (let i = n - 1; i > 0; i--) {
      // Move current root to end
      await this.swap(0, i);
      
      // Call heapify on the reduced heap
      await this.heapify(i, 0);
    }
  }
  
  // To heapify a subtree rooted with node i which is an index in this.dataset[]
  // n is size of heap
  async heapify(n, i) {
    let largest = i; // Initialize largest as root
    const left = 2 * i + 1; // left = 2*i + 1
    const right = 2 * i + 2; // right = 2*i + 2
    
    // If left child is larger than root
    if (left < n) {
      const isLarger = await this.compare(largest, left);
      if (!isLarger) {
        largest = left;
      }
    }
    
    // If right child is larger than largest so far
    if (right < n) {
      const isLarger = await this.compare(largest, right);
      if (!isLarger) {
        largest = right;
      }
    }
    
    // If largest is not root
    if (largest !== i) {
      await this.swap(i, largest);
      
      // Recursively heapify the affected sub-tree
      await this.heapify(n, largest);
    }
  }
}

/**
 * Traditional Merge Sort
 * 
 * Classic divide-and-conquer algorithm that divides the array into two halves,
 * sorts them separately, and then merges them using auxiliary storage.
 * This is the textbook implementation with O(n log n) time and O(n) space complexity.
 */
class MergeSort extends SortingAlgorithm {
  constructor(dataset, stepSpeed) {
    super(dataset, stepSpeed);
    this.auxArray = new Array(dataset.length);
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
    // Copy data to auxiliary array
    for (let i = left; i <= right; i++) {
      this.arrayAccesses++; // Count read from dataset
      this.arrayWrites++; // Count write to auxiliary array
      this.auxArray[i] = this.dataset[i];
      
      // Visualize copying to auxiliary array
      this.currentStep++;
      this.lastOperation = {
        type: 'copy_to_aux',
        indices: [i], // Only highlight the current index
        values: [this.dataset[i], this.auxArray[i]]
      };
      await sleep(this.stepSpeed);
    }
    
    let i = left;      // Initial index of first subarray
    let j = mid + 1;   // Initial index of second subarray
    let k = left;      // Initial index of merged subarray
    
    // Merge back from aux array to the original array
    while (i <= mid && j <= right) {
      // Compare elements from both subarrays
      await this.compare(i, j);
      
      this.arrayAccesses++; // Count read from auxiliary array
      if (this.auxArray[i] <= this.auxArray[j]) {
        // Element from first subarray is smaller
        this.arrayAccesses++; // Count read from auxiliary array for i
        this.arrayWrites++; // Count write to dataset
        this.dataset[k] = this.auxArray[i];
        i++;
      } else {
        // Element from second subarray is smaller
        this.arrayAccesses++; // Count read from auxiliary array for j
        this.arrayWrites++; // Count write to dataset
        this.dataset[k] = this.auxArray[j];
        j++;
      }
      
       // Visualize the placement
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, i-1 < left ? j-1 : i-1], // Include both the destination index and the source index
        values: [this.dataset[k], this.auxArray[i-1 < left ? j-1 : i-1]]
      };
      await sleep(this.stepSpeed);
      
      k++;
      
    } 
    
    // Copy remaining elements from first subarray
    while (i <= mid) {
      this.arrayAccesses++; // Count read from auxiliary array
      this.arrayWrites++; // Count write to dataset
      this.dataset[k] = this.auxArray[i];
      
      // Visualize the copy back
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, i], // Include both destination and source indices
        values: [this.dataset[k], this.auxArray[i]]
      };
      await sleep(this.stepSpeed);
      
      i++;
      k++;
    }
    
    // Copy remaining elements from second subarray
    while (j <= right) {
      this.arrayAccesses++; // Count read from auxiliary array
      this.arrayWrites++; // Count write to dataset
      this.dataset[k] = this.auxArray[j];
      
      // Visualize the copy back
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, j], // Include both destination and source indices
        values: [this.dataset[k], this.auxArray[j]]
      };
      await sleep(this.stepSpeed);
      
      j++;
      k++;
    }
  }
}

/**
 * TimSort
 * 
 * A hybrid stable sorting algorithm derived from merge sort and insertion sort.
 * Used as the default sort in Java, Python, and many other languages.
 * Works by first dividing the array into small runs and sorting them with insertion sort,
 * then merges the runs using merge sort's merge algorithm.
 */
class TimSort extends SortingAlgorithm {
  constructor(dataset, stepSpeed) {
    super(dataset, stepSpeed);
    this.auxArray = new Array(dataset.length);
    this.MIN_RUN = 16; // Balance between too small and too large
  }
  
  async sort() {
    const n = this.dataset.length;
    
    // For very small arrays, just use insertion sort directly
    if (n <= this.MIN_RUN) {
      await this.insertionSort(0, n - 1);
      return;
    }
    
    // First pass: Create runs of MIN_RUN length and sort them
    for (let i = 0; i < n; i += this.MIN_RUN) {
      const end = Math.min(i + this.MIN_RUN - 1, n - 1);
      // Sort this run using insertion sort
      await this.insertionSort(i, end);
    }
    
    // Second pass: Merge runs - standard bottom-up merge approach
    // Similar to merge sort but starting with larger chunks
    for (let width = this.MIN_RUN; width < n; width = 2 * width) {
      for (let i = 0; i < n; i = i + 2 * width) {
        const mid = Math.min(i + width - 1, n - 1);
        const right = Math.min(i + 2 * width - 1, n - 1);
        
        // Always merge if we have two runs to merge
        if (mid < right) {
          await this.mergeRuns(i, mid, right);
        }
      }
    }
    
    // Verify the array is sorted
    let isSorted = true;
    for (let i = 0; i < n - 1; i++) {
      if (this.dataset[i] > this.dataset[i + 1]) {
        isSorted = false;
        break;
      }
    }
    
    // If not fully sorted, do a final merge pass
    if (!isSorted) {
      await this.mergeSort(0, n - 1);
    }
  }
  
  // Standard merge sort as a fallback
  async mergeSort(left, right) {
    if (left < right) {
      const mid = Math.floor((left + right) / 2);
      await this.mergeSort(left, mid);
      await this.mergeSort(mid + 1, right);
      await this.mergeRuns(left, mid, right);
    }
  }
  
  // More efficient insertion sort that minimizes comparisons
  async insertionSort(left, right) {
    for (let i = left + 1; i <= right; i++) {
      // Only store key value if we need to move elements
      let j = i - 1;
      
      // First check if we need to do anything
      const needsInsert = await this.compare(j, i);
      
      if (needsInsert) {
        this.arrayAccesses++; // Count access for reading key
        const key = this.dataset[i];
        
        // If we need to insert, use direct approach
        while (j >= left && this.dataset[j] > key) {
          this.arrayAccesses++; // Count access for reading dataset[j]
          this.arrayWrites++; // Count write for dataset[j+1]
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
        }
        
        // Place the key in its correct position
        this.arrayWrites++; // Count write for dataset[j+1]
        this.dataset[j + 1] = key;
        
        // Visualize the final insertion
        this.swaps++;
        this.currentStep++;
        this.lastOperation = {
          type: 'swap',
          indices: [j + 1, i],
          values: [this.dataset[j + 1], key]
        };
        await sleep(this.stepSpeed);
      }
    }
  }
  
  // Standard merge function for reliability
  async mergeRuns(left, mid, right) {
    // Copy to auxiliary array
    for (let i = left; i <= right; i++) {
      this.arrayAccesses++; // Count read from dataset
      this.arrayWrites++; // Count write to auxiliary array
      this.auxArray[i] = this.dataset[i];
    }
    
    // Visualize the copy operation
    this.currentStep++;
    this.lastOperation = {
      type: 'copy_to_aux',
      indices: [left, right],
      values: [this.dataset[left], this.dataset[right]]
    };
    await sleep(this.stepSpeed);
    
    let i = left;      // Index for left subarray
    let j = mid + 1;   // Index for right subarray
    let k = left;      // Index for merged array
    
    // Standard merge process
    while (i <= mid && j <= right) {
      await this.compare(i, j);
      
      this.arrayAccesses += 2; // Count reads from auxiliary array
      if (this.auxArray[i] <= this.auxArray[j]) {
        this.arrayWrites++; // Count write to dataset
        this.dataset[k] = this.auxArray[i];
        i++;
      } else {
        this.arrayWrites++; // Count write to dataset
        this.dataset[k] = this.auxArray[j];
        j++;
      }
      
      // Visualize the placement
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, (k === left + (i - left - 1)) ? i - 1 : j - 1],
        values: [this.dataset[k], this.auxArray[(k === left + (i - left - 1)) ? i - 1 : j - 1]]
      };
      await sleep(this.stepSpeed);
      
      k++;
    }
    
    // Copy remaining elements from left subarray
    while (i <= mid) {
      this.arrayAccesses++; // Count read from auxiliary array
      this.arrayWrites++; // Count write to dataset
      this.dataset[k] = this.auxArray[i];
      
      // Visualize the copy
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, i],
        values: [this.dataset[k], this.auxArray[i]]
      };
      await sleep(this.stepSpeed);
      
      i++;
      k++;
    }
    
    // Copy remaining elements from right subarray
    while (j <= right) {
      this.arrayAccesses++; // Count read from auxiliary array
      this.arrayWrites++; // Count write to dataset
      this.dataset[k] = this.auxArray[j];
      
      // Visualize the copy
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, j],
        values: [this.dataset[k], this.auxArray[j]]
      };
      await sleep(this.stepSpeed);
      
      j++;
      k++;
    }
  }
}

/**
 * PowerSort
 * 
 * A modern adaptive sorting algorithm that improves upon TimSort
 * by using powers of 2 to determine optimal merge points.
 * It has better worst-case guarantees and adapts even better to patterns in the data.
 * Developed in 2020, it's one of the newest practical sorting algorithms.
 */
class PowerSort extends SortingAlgorithm {
  constructor(dataset, stepSpeed) {
    super(dataset, stepSpeed);
    this.auxArray = new Array(dataset.length);
    this.MIN_RUN = 16; // Minimum size of a run
    this.stack = []; // Stack of pending runs
  }
  
  async sort() {
    const n = this.dataset.length;
    
    // Handle small arrays with insertion sort
    if (n <= this.MIN_RUN) {
      await this.insertionSort(0, n - 1);
      return;
    }
    
    // Reset stack for this sort operation
    this.stack = [];
    
    let i = 0;
    
    // Process the input by finding natural runs
    while (i < n) {
      // Find a natural run or create a MIN_RUN sized run
      let runLength = await this.findRunLength(i, Math.min(i + this.MIN_RUN * 2, n));
      
      // Extend run to MIN_RUN if too short
      if (runLength < this.MIN_RUN) {
        runLength = Math.min(this.MIN_RUN, n - i);
        // Sort this short run with insertion sort
        await this.insertionSort(i, i + runLength - 1);
      }
      
      // Push this run onto the stack
      this.pushRun(i, runLength);
      
      // Merge runs according to PowerSort strategy to maintain balance
      await this.mergeCollapse();
      
      // Move to the next chunk
      i += runLength;
    }
    
    // Merge any remaining runs
    await this.mergeForce();
  }
  
  // Find the length of a natural run starting at index start
  async findRunLength(start, maxEnd) {
    const n = this.dataset.length;
    if (start >= n - 1) return 1;
    
    // Start with a run of length 2
    let runLength = 2;
    
    // Compare first two elements to determine if run is increasing or decreasing
    await this.compare(start, start + 1);
    let increasing = this.dataset[start] <= this.dataset[start + 1];
    
    // TimSort optimized natural run detection
    for (let i = start + 2; i < Math.min(maxEnd, n); i++) {
      // Check if the current element maintains the run order
      await this.compare(i - 1, i);
      
      // For increasing runs: current >= previous
      // For decreasing runs: current < previous
      if ((increasing && this.dataset[i - 1] <= this.dataset[i]) ||
          (!increasing && this.dataset[i - 1] > this.dataset[i])) {
        runLength++;
      } else {
        break; // Run ends here
      }
    }
    
    // For descending runs, reverse the elements (like in TimSort)
    if (!increasing) {
      // More efficient in-place reversal
      let left = start;
      let right = start + runLength - 1;
      
      while (left < right) {
        await this.swap(left, right);
        left++;
        right--;
      }
    }
    
    return runLength;
  }
  
  // Push a run onto the stack
  pushRun(start, length) {
    this.stack.push({
      start: start,
      length: length,
      power: this.computePower(length)
    });
  }
  
  // Compute the power used for merge decision
  computePower(n) {
    // Original implementation has inefficient power computation
    // Let's optimize it for faster determination
    return Math.floor(Math.log2(n)); // Use Math.log2 for direct power-of-2 calculation
  }
  
  // Merge runs according to PowerSort strategy
  async mergeCollapse() {
    // PowerSort merges based on a power-of-2 strategy
    while (this.stack.length >= 3) {
      const n = this.stack.length;
      const X = this.stack[n-3];
      const Y = this.stack[n-2];
      const Z = this.stack[n-1];
      
      // Original PowerSort paper merging criteria - simplified version
      if (X.length < Y.length + Z.length && Y.length < Z.length) {
        // Merge Y and X (second-to-last and third-to-last)
        if (X.length < Z.length) {
          await this.mergeRuns(X.start, X.start + X.length - 1, Y.start + Y.length - 1);
          
          // Update stack - combine X and Y
          this.stack[n-3] = {
            start: X.start,
            length: X.length + Y.length,
            power: this.computePower(X.length + Y.length)
          };
          this.stack.splice(n-2, 1); // Remove Y
        } else {
          // Merge Y and Z (second-to-last and last)
          await this.mergeRuns(Y.start, Y.start + Y.length - 1, Z.start + Z.length - 1);
          
          // Update stack - combine Y and Z
          this.stack[n-2] = {
            start: Y.start,
            length: Y.length + Z.length,
            power: this.computePower(Y.length + Z.length)
          };
          this.stack.splice(n-1, 1); // Remove Z
        }
      } else {
        break; // Stack is already balanced
      }
    }
    
    // Additional special case for 2 runs
    if (this.stack.length == 2) {
      const X = this.stack[0];
      const Y = this.stack[1];
      
      // If stack has only 2 runs and they're imbalanced
      if (X.length < Y.length && X.length < 16) {
        await this.mergeRuns(X.start, X.start + X.length - 1, Y.start + Y.length - 1);
        
        // Update stack - combine X and Y
        this.stack[0] = {
          start: X.start,
          length: X.length + Y.length,
          power: this.computePower(X.length + Y.length)
        };
        this.stack.splice(1, 1); // Remove Y
      }
    }
  }
  
  // Merge all remaining runs
  async mergeForce() {
    // Keep merging until only one run remains
    while (this.stack.length > 1) {
      const n = this.stack.length;
      
      // Always merge the two smallest adjacent runs to minimize temporary space
      // Find the two smallest consecutive runs
      let minIdx = 0;
      let minSum = Infinity;
      
      for (let i = 0; i < n - 1; i++) {
        const sum = this.stack[i].length + this.stack[i + 1].length;
        if (sum < minSum) {
          minSum = sum;
          minIdx = i;
        }
      }
      
      // Merge these two runs
      const X = this.stack[minIdx];
      const Y = this.stack[minIdx + 1];
      
      await this.mergeRuns(X.start, X.start + X.length - 1, Y.start + Y.length - 1);
      
      // Update stack
      this.stack[minIdx] = {
        start: X.start,
        length: X.length + Y.length,
        power: this.computePower(X.length + Y.length)
      };
      
      // Remove the merged run
      this.stack.splice(minIdx + 1, 1);
    }
  }
  
  // Insertion sort for small runs
  async insertionSort(left, right) {
    for (let i = left + 1; i <= right; i++) {
      // First check if we need to do anything
      let j = i - 1;
      const needsInsert = await this.compare(j, i);
      
      if (needsInsert) {
        this.arrayAccesses++; // Count access for reading key
        const key = this.dataset[i];
        
        while (j >= left && this.dataset[j] > key) {
          this.arrayAccesses++; // Count access for reading dataset[j]
          this.arrayWrites++; // Count write for dataset[j+1]
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
        }
        
        // Place the key in its correct position
        this.arrayWrites++; // Count write for dataset[j+1]
        this.dataset[j + 1] = key;
        
        // Visualize the insertion
        this.swaps++;
        this.currentStep++;
        this.lastOperation = {
          type: 'swap',
          indices: [j + 1, i],
          values: [this.dataset[j + 1], key]
        };
        await sleep(this.stepSpeed);
      }
    }
  }
  
  // Standard merge function
  async mergeRuns(left, mid, right) {
    // Copy to auxiliary array
    for (let i = left; i <= right; i++) {
      this.arrayAccesses++; // Count read from dataset
      this.arrayWrites++; // Count write to auxiliary array
      this.auxArray[i] = this.dataset[i];
    }
    
    // Visualize the copy operation
    this.currentStep++;
    this.lastOperation = {
      type: 'copy_to_aux',
      indices: [left, right],
      values: [this.dataset[left], this.dataset[right]]
    };
    await sleep(this.stepSpeed);
    
    let i = left;      // Index for left subarray
    let j = mid + 1;   // Index for right subarray
    let k = left;      // Index for merged array
    
    // Standard merge process
    while (i <= mid && j <= right) {
      await this.compare(i, j);
      
      this.arrayAccesses += 2; // Count reads from auxiliary array
      if (this.auxArray[i] <= this.auxArray[j]) {
        this.arrayWrites++; // Count write to dataset
        this.dataset[k] = this.auxArray[i];
        i++;
      } else {
        this.arrayWrites++; // Count write to dataset
        this.dataset[k] = this.auxArray[j];
        j++;
      }
      
      // Visualize the placement
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, (k === left + (i - left - 1)) ? i - 1 : j - 1],
        values: [this.dataset[k], this.auxArray[(k === left + (i - left - 1)) ? i - 1 : j - 1]]
      };
      await sleep(this.stepSpeed);
      
      k++;
    }
    
    // Copy remaining elements from left subarray
    while (i <= mid) {
      this.arrayAccesses++; // Count read from auxiliary array
      this.arrayWrites++; // Count write to dataset
      this.dataset[k] = this.auxArray[i];
      
      // Visualize the copy
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, i],
        values: [this.dataset[k], this.auxArray[i]]
      };
      await sleep(this.stepSpeed);
      
      i++;
      k++;
    }
    
    // Copy remaining elements from right subarray
    while (j <= right) {
      this.arrayAccesses++; // Count read from auxiliary array
      this.arrayWrites++; // Count write to dataset
      this.dataset[k] = this.auxArray[j];
      
      // Visualize the copy
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [k, j],
        values: [this.dataset[k], this.auxArray[j]]
      };
      await sleep(this.stepSpeed);
      
      j++;
      k++;
    }
  }
}

/**
 * Bogo Sort
 * 
 * A highly inefficient sorting algorithm that works by repeatedly randomly 
 * shuffling the array until it happens to be sorted.
 * This implementation counts each shuffle as a single operation.
 */
class BogoSort extends SortingAlgorithm {
  async sort() {
    // Check if the array is already sorted
    while (!this.isSorted()) {
      // If not sorted, shuffle the entire array as a single operation
      await this.shuffleArray();
      
      // Check if we should continue running
      if (!this.isRunning) break;
    }
  }
  
  // Check if array is sorted
  isSorted() {
    for (let i = 0; i < this.dataset.length - 1; i++) {
      if (this.dataset[i] > this.dataset[i + 1]) {
        return false;
      }
    }
    return true;
  }
  
  // Shuffle the entire array (Fisher-Yates algorithm)
  async shuffleArray() {
    const n = this.dataset.length;
    const originalArray = [...this.dataset]; // Save for visualization
    
    // Fisher-Yates shuffle
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.dataset[i], this.dataset[j]] = [this.dataset[j], this.dataset[i]];
    }
    
    // Count shuffle as a single operation
    this.swaps++;
    this.currentStep++;
    this.lastOperation = {
      type: 'shuffle',
      indices: [...Array(n).keys()], // All indices are affected
      values: originalArray // The original values before shuffle
    };
    
    // Wait for visualization delay
    await sleep(this.stepSpeed);
  }
}

/**
 * Stalin Sort
 * 
 * A joke sorting algorithm where elements that are not in order are simply removed.
 * Named after Joseph Stalin's tendency to "remove" people that did not fit his regime.
 */
class StalinSort extends SortingAlgorithm {
  async sort() {
    const n = this.dataset.length;
    if (n <= 1) return; // Already sorted
    
    let currentMax = this.dataset[0];
    let i = 1;
    
    while (i < this.dataset.length) {
      // Compare current element with current maximum
      await this.compare(i - 1, i);
      
      // If current element is less than the current maximum, remove it
      if (this.dataset[i] < currentMax) {
        // Mark the removal in our visualization
        this.swaps++;
        this.currentStep++;
        this.lastOperation = {
          type: 'removal',
          indices: [i],
          values: [this.dataset[i]]
        };
        
        // Remove the element (splice is used for visualization purposes)
        this.dataset.splice(i, 1);
        
        // Wait for visualization delay
        await sleep(this.stepSpeed);
      } else {
        // Element stays, update the current maximum
        currentMax = this.dataset[i];
        i++;
      }
    }
  }
}

/**
 * Gnome Sort
 * 
 * A simple comparison-based sorting algorithm that works by repeatedly
 * swapping adjacent elements if they're in the wrong order, similar to
 * how a garden gnome sorts flower pots. Also called "Stupid Sort".
 * It's conceptually simple but not very efficient for large datasets.
 */
class GnomeSort extends SortingAlgorithm {
  async sort() {
    const n = this.dataset.length;
    let index = 0;
    
    while (index < n) {
      if (index === 0) {
        index++;
      }
      
      // Compare current element with the previous one
      await this.compare(index - 1, index);
      
      if (this.dataset[index] >= this.dataset[index - 1]) {
        // Elements are in correct order, move forward
        index++;
      } else {
        // Elements are in wrong order, swap them and move backward
        this.arrayAccesses += 2; // Count reads for swap
        this.arrayWrites += 2;   // Count writes for swap
        await this.swap(index, index - 1);
        index--;
      }
    }
  }
}

/**
 * Radix Sort
 * 
 * A non-comparative integer sorting algorithm that sorts data by processing
 * individual digits. It uses counting sort as a subroutine to sort.
 * Works by distributing elements into buckets according to their radix (digit value),
 * and then recollecting them in order.
 */
class RadixSort extends SortingAlgorithm {
  async sort() {
    const n = this.dataset.length;
    if (n <= 1) return;
    
    // Find the maximum number to know the number of digits
    let max = this.dataset[0];
    this.arrayAccesses++; // Count reading max
    
    for (let i = 1; i < n; i++) {
      this.arrayAccesses++; // Count reading for max comparison
      if (this.dataset[i] > max) {
        max = this.dataset[i];
      }
    }
    
    // Do counting sort for every digit
    // exp is 10^i where i is the current digit number
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
      await this.countingSort(exp);
    }
  }
  
  // A function to do counting sort according to the digit represented by exp
  async countingSort(exp) {
    const n = this.dataset.length;
    
    // Create output array and count array
    const output = new Array(n);
    const count = new Array(10).fill(0);
    
    // Store count of occurrences in count[]
    for (let i = 0; i < n; i++) {
      this.arrayAccesses++; // Count reading from dataset
      const digit = Math.floor(this.dataset[i] / exp) % 10;
      count[digit]++;
      
      // Visualize the bucketing operation
      this.currentStep++;
      this.lastOperation = {
        type: 'bucketing',
        indices: [i],
        values: [this.dataset[i]]
      };
      await sleep(this.stepSpeed);
    }
    
    // Change count[i] so that count[i] now contains actual
    // position of this digit in output[]
    for (let i = 1; i < 10; i++) {
      count[i] += count[i - 1];
    }
    
    // Build the output array
    for (let i = n - 1; i >= 0; i--) {
      this.arrayAccesses++; // Count reading from dataset
      const digit = Math.floor(this.dataset[i] / exp) % 10;
      
      this.arrayWrites++; // Count writing to output
      output[count[digit] - 1] = this.dataset[i];
      count[digit]--;
      
      // Visualize placing elements in output array
      this.currentStep++;
      this.lastOperation = {
        type: 'place',
        indices: [i, count[digit]],
        values: [this.dataset[i], output[count[digit]]]
      };
      await sleep(this.stepSpeed);
    }
    
    // Copy the output array to dataset[]
    for (let i = 0; i < n; i++) {
      this.arrayWrites++; // Count writing back to dataset
      this.dataset[i] = output[i];
      
      // Visualize copying back
      this.swaps++;
      this.currentStep++;
      this.lastOperation = {
        type: 'swap',
        indices: [i],
        values: [output[i]]
      };
      await sleep(this.stepSpeed);
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
    case 'inplacestable': 
      // In-place stable sort (no auxiliary array)
      return new InPlaceStableSort(dataset, stepSpeed);
    case 'merge':
      // Traditional merge sort with auxiliary array
      return new MergeSort(dataset, stepSpeed);
    case 'insertion':
      return new InsertionSort(dataset, stepSpeed);
    case 'selection':
      return new SelectionSort(dataset, stepSpeed);
    case 'heap':
      // Heap sort using binary heap data structure
      return new HeapSort(dataset, stepSpeed);
    case 'timsort':
      // TimSort - hybrid sorting algorithm
      return new TimSort(dataset, stepSpeed);
    case 'powersort':
      // PowerSort - modern adaptive sorting algorithm
      return new PowerSort(dataset, stepSpeed);
    case 'bogo':
      // Bogo sort - highly inefficient random shuffle sort
      return new BogoSort(dataset, stepSpeed);
    case 'stalin':
      // Stalin sort - joke sorting algorithm
      return new StalinSort(dataset, stepSpeed);
    case 'gnome':
      // Gnome sort - simple back and forth sorting algorithm
      return new GnomeSort(dataset, stepSpeed);
    case 'radix':
      // Radix sort - non-comparative integer sorting algorithm
      return new RadixSort(dataset, stepSpeed);
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