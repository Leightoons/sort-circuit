// Define the preferred algorithm display order
export const ALGORITHM_ORDER = {
  'bubble': 1,
  'insertion': 2,
  'selection': 3,
  'heap': 4,
  'inplacestable': 5,
  'merge': 6,
  'timsort': 7,
  'powersort': 8,
  'quick': 9,
  'radix': 10,
  'radixbit': 11,
  'bogo': 12,
  'stalin': 13,
  'gnome': 14
};

// Define proper display names for each algorithm
export const ALGORITHM_NAMES = {
  'bubble': 'Bubble Sort',
  'insertion': 'Insertion Sort',
  'selection': 'Selection Sort',
  'inplacestable': 'In-Place Stable Sort',
  'merge': 'Merge Sort',
  'timsort': 'TimSort',
  'powersort': 'PowerSort',
  'quick': 'Quick Sort',
  'heap': 'Heap Sort',
  'radix': 'Radix Sort (Decimal)',
  'radixbit': 'Radix Sort (Binary)',
  'bogo': 'Bogo Sort',
  'stalin': 'Stalin Sort',
  'gnome': 'Gnome Sort'
};

// Helper function to get the display name for an algorithm
export const getAlgorithmDisplayName = (algorithmId) => {
  return ALGORITHM_NAMES[algorithmId] || algorithmId.charAt(0).toUpperCase() + algorithmId.slice(1) + ' Sort';
}; 