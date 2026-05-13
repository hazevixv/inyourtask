/**
 * Tests for View Persistence Manager
 * 
 * This file contains both unit tests and property-based tests for the viewPersistence module.
 * 
 * Testing approach:
 * - Unit tests for error handling, edge cases, and specific scenarios
 * - Property-based tests for serialization, validation, and data integrity
 * 
 * Requirements tested: 10.1-10.10, 14.1-14.3, 16.1-16.10
 */

import {
  loadViewPreferences,
  saveViewPreferences,
  validatePreferences,
  getDefaultPreferences,
  handleQuotaExceeded,
  isLocalStorageAvailable,
  clearAllViewPreferences,
  STORAGE_KEYS,
  type ViewPreferences,
  type FilterCondition,
  type SortRule,
} from './viewPersistence';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

// Setup global mocks
beforeAll(() => {
  Object.defineProperty(global, 'window', {
    value: {
      localStorage: localStorageMock,
    },
    writable: true,
  });
});

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

// ============================================================================
// Unit Tests - Default Preferences
// ============================================================================

describe('getDefaultPreferences', () => {
  test('returns correct defaults for tasks', () => {
    const defaults = getDefaultPreferences('tasks');

    expect(defaults.layout).toBe('table');
    expect(defaults.visibleColumns).toContain('name');
    expect(defaults.visibleColumns).toContain('status');
    expect(defaults.visibleColumns).toContain('priority');
    expect(defaults.filters).toEqual([]);
    expect(defaults.sorts).toEqual([]);
    expect(defaults.groupBy).toBe('project');
    expect(defaults.collapsedGroups).toEqual([]);
  });

  test('returns correct defaults for projects', () => {
    const defaults = getDefaultPreferences('projects');

    expect(defaults.layout).toBe('table');
    expect(defaults.visibleColumns).toContain('name');
    expect(defaults.visibleColumns).toContain('category');
    expect(defaults.visibleColumns).toContain('status');
    expect(defaults.filters).toEqual([]);
    expect(defaults.sorts).toEqual([]);
    expect(defaults.groupBy).toBeUndefined();
    expect(defaults.collapsedGroups).toEqual([]);
  });

  test('returns independent copies (not shared references)', () => {
    const defaults1 = getDefaultPreferences('tasks');
    const defaults2 = getDefaultPreferences('tasks');

    defaults1.visibleColumns.push('custom');

    expect(defaults2.visibleColumns).not.toContain('custom');
  });
});

// ============================================================================
// Unit Tests - Validation
// ============================================================================

describe('validatePreferences', () => {
  test('accepts valid preferences object', () => {
    const valid: ViewPreferences = {
      layout: 'table',
      visibleColumns: ['name', 'status'],
      filters: [],
      sorts: [],
    };

    expect(validatePreferences(valid)).toBe(true);
  });

  test('rejects null or undefined', () => {
    expect(validatePreferences(null)).toBe(false);
    expect(validatePreferences(undefined)).toBe(false);
  });

  test('rejects non-object values', () => {
    expect(validatePreferences('string')).toBe(false);
    expect(validatePreferences(123)).toBe(false);
    expect(validatePreferences([])).toBe(false);
  });

  test('rejects invalid layout values', () => {
    const invalid = {
      layout: 'grid',
      visibleColumns: ['name'],
      filters: [],
      sorts: [],
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('rejects missing layout field', () => {
    const invalid = {
      visibleColumns: ['name'],
      filters: [],
      sorts: [],
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('rejects non-array visibleColumns', () => {
    const invalid = {
      layout: 'table',
      visibleColumns: 'name,status',
      filters: [],
      sorts: [],
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('rejects visibleColumns with non-string elements', () => {
    const invalid = {
      layout: 'table',
      visibleColumns: ['name', 123, 'status'],
      filters: [],
      sorts: [],
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('rejects non-array filters', () => {
    const invalid = {
      layout: 'table',
      visibleColumns: ['name'],
      filters: {},
      sorts: [],
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('rejects invalid filter conditions', () => {
    const invalid = {
      layout: 'table',
      visibleColumns: ['name'],
      filters: [
        {
          id: 'filter-1',
          field: 'status',
          operator: 'invalid_operator',
        },
      ],
      sorts: [],
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('rejects filter conditions missing required fields', () => {
    const invalid = {
      layout: 'table',
      visibleColumns: ['name'],
      filters: [
        {
          id: 'filter-1',
          operator: 'equals',
        },
      ],
      sorts: [],
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('rejects non-array sorts', () => {
    const invalid = {
      layout: 'table',
      visibleColumns: ['name'],
      filters: [],
      sorts: {},
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('rejects invalid sort rules', () => {
    const invalid = {
      layout: 'table',
      visibleColumns: ['name'],
      filters: [],
      sorts: [
        {
          id: 'sort-1',
          field: 'status',
          direction: 'invalid',
        },
      ],
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('rejects sort rules missing required fields', () => {
    const invalid = {
      layout: 'table',
      visibleColumns: ['name'],
      filters: [],
      sorts: [
        {
          id: 'sort-1',
          direction: 'asc',
        },
      ],
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('rejects invalid groupBy values', () => {
    const invalid = {
      layout: 'table',
      visibleColumns: ['name'],
      filters: [],
      sorts: [],
      groupBy: 'invalid',
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('accepts null groupBy', () => {
    const valid = {
      layout: 'table',
      visibleColumns: ['name'],
      filters: [],
      sorts: [],
      groupBy: null,
    };

    expect(validatePreferences(valid)).toBe(true);
  });

  test('accepts "project" groupBy', () => {
    const valid = {
      layout: 'table',
      visibleColumns: ['name'],
      filters: [],
      sorts: [],
      groupBy: 'project',
    };

    expect(validatePreferences(valid)).toBe(true);
  });

  test('rejects non-array collapsedGroups', () => {
    const invalid = {
      layout: 'table',
      visibleColumns: ['name'],
      filters: [],
      sorts: [],
      collapsedGroups: 'group1,group2',
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('rejects collapsedGroups with non-string elements', () => {
    const invalid = {
      layout: 'table',
      visibleColumns: ['name'],
      filters: [],
      sorts: [],
      collapsedGroups: ['group1', 123, 'group2'],
    };

    expect(validatePreferences(invalid)).toBe(false);
  });

  test('accepts valid complete preferences with all optional fields', () => {
    const valid: ViewPreferences = {
      layout: 'list',
      visibleColumns: ['name', 'status', 'priority'],
      filters: [
        {
          id: 'filter-1',
          field: 'status',
          operator: 'equals',
          value: 'Active',
        },
      ],
      sorts: [
        {
          id: 'sort-1',
          field: 'priority',
          direction: 'desc',
        },
      ],
      groupBy: 'project',
      collapsedGroups: ['PROJ-001', 'PROJ-002'],
    };

    expect(validatePreferences(valid)).toBe(true);
  });
});

// ============================================================================
// Unit Tests - Save and Load
// ============================================================================

describe('saveViewPreferences', () => {
  test('saves valid preferences to localStorage', () => {
    const prefs: ViewPreferences = {
      layout: 'list',
      visibleColumns: ['name', 'status'],
      filters: [],
      sorts: [],
    };

    const result = saveViewPreferences(STORAGE_KEYS.TASKS, prefs);

    expect(result).toBe(true);
    expect(localStorageMock.getItem(STORAGE_KEYS.TASKS)).toBeTruthy();
  });

  test('returns false for invalid preferences', () => {
    const invalid = {
      layout: 'invalid',
      visibleColumns: ['name'],
      filters: [],
      sorts: [],
    };

    const result = saveViewPreferences(STORAGE_KEYS.TASKS, invalid as any);

    expect(result).toBe(false);
    expect(localStorageMock.getItem(STORAGE_KEYS.TASKS)).toBeNull();
  });

  test('handles localStorage unavailable', () => {
    // Temporarily remove localStorage
    const originalLocalStorage = global.window.localStorage;
    delete (global.window as any).localStorage;

    const prefs = getDefaultPreferences('tasks');
    const result = saveViewPreferences(STORAGE_KEYS.TASKS, prefs);

    expect(result).toBe(false);

    // Restore localStorage
    (global.window as any).localStorage = originalLocalStorage;
  });

  test('handles quota exceeded error', () => {
    const prefs = getDefaultPreferences('tasks');

    // Mock setItem to throw QuotaExceededError
    const originalSetItem = localStorageMock.setItem;
    let callCount = 0;
    localStorageMock.setItem = jest.fn((key: string, value: string) => {
      callCount++;
      if (callCount === 1) {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw error;
      }
      // Second call succeeds
      originalSetItem.call(localStorageMock, key, value);
    });

    const result = saveViewPreferences(STORAGE_KEYS.TASKS, prefs);

    expect(result).toBe(true);
    expect(callCount).toBe(2); // First call fails, second succeeds

    // Restore original setItem
    localStorageMock.setItem = originalSetItem;
  });
});

describe('loadViewPreferences', () => {
  test('loads valid preferences from localStorage', () => {
    const prefs: ViewPreferences = {
      layout: 'list',
      visibleColumns: ['name', 'status'],
      filters: [],
      sorts: [],
    };

    saveViewPreferences(STORAGE_KEYS.TASKS, prefs);
    const loaded = loadViewPreferences(STORAGE_KEYS.TASKS);

    expect(loaded).toEqual(prefs);
  });

  test('returns null for missing key', () => {
    const loaded = loadViewPreferences(STORAGE_KEYS.TASKS);

    expect(loaded).toBeNull();
  });

  test('returns null for corrupted JSON', () => {
    localStorageMock.setItem(STORAGE_KEYS.TASKS, 'invalid json {{{');

    const loaded = loadViewPreferences(STORAGE_KEYS.TASKS);

    expect(loaded).toBeNull();
  });

  test('returns null for invalid preferences structure', () => {
    const invalid = {
      layout: 'invalid',
      visibleColumns: ['name'],
    };

    localStorageMock.setItem(STORAGE_KEYS.TASKS, JSON.stringify(invalid));

    const loaded = loadViewPreferences(STORAGE_KEYS.TASKS);

    expect(loaded).toBeNull();
  });

  test('handles localStorage unavailable', () => {
    // Temporarily remove localStorage
    const originalLocalStorage = global.window.localStorage;
    delete (global.window as any).localStorage;

    const loaded = loadViewPreferences(STORAGE_KEYS.TASKS);

    expect(loaded).toBeNull();

    // Restore localStorage
    (global.window as any).localStorage = originalLocalStorage;
  });
});

// ============================================================================
// Unit Tests - Quota Handling
// ============================================================================

describe('handleQuotaExceeded', () => {
  test('clears other view settings keys', () => {
    // Setup: save preferences for both tasks and projects
    const tasksPrefs = getDefaultPreferences('tasks');
    const projectsPrefs = getDefaultPreferences('projects');

    saveViewPreferences(STORAGE_KEYS.TASKS, tasksPrefs);
    saveViewPreferences(STORAGE_KEYS.PROJECTS, projectsPrefs);

    expect(localStorageMock.getItem(STORAGE_KEYS.TASKS)).toBeTruthy();
    expect(localStorageMock.getItem(STORAGE_KEYS.PROJECTS)).toBeTruthy();

    // Handle quota exceeded for tasks key
    handleQuotaExceeded(STORAGE_KEYS.TASKS);

    // Projects key should be cleared, tasks key should also be cleared
    expect(localStorageMock.getItem(STORAGE_KEYS.PROJECTS)).toBeNull();
    expect(localStorageMock.getItem(STORAGE_KEYS.TASKS)).toBeNull();
  });

  test('handles localStorage unavailable', () => {
    // Temporarily remove localStorage
    const originalLocalStorage = global.window.localStorage;
    delete (global.window as any).localStorage;

    // Should not throw
    expect(() => handleQuotaExceeded(STORAGE_KEYS.TASKS)).not.toThrow();

    // Restore localStorage
    (global.window as any).localStorage = originalLocalStorage;
  });
});

// ============================================================================
// Unit Tests - Utility Functions
// ============================================================================

describe('isLocalStorageAvailable', () => {
  test('returns true when localStorage is available', () => {
    expect(isLocalStorageAvailable()).toBe(true);
  });

  test('returns false when localStorage is unavailable', () => {
    // Temporarily remove localStorage
    const originalLocalStorage = global.window.localStorage;
    delete (global.window as any).localStorage;

    expect(isLocalStorageAvailable()).toBe(false);

    // Restore localStorage
    (global.window as any).localStorage = originalLocalStorage;
  });

  test('returns false when localStorage throws on access', () => {
    // Mock localStorage to throw
    const originalLocalStorage = global.window.localStorage;
    Object.defineProperty(global.window, 'localStorage', {
      get: () => {
        throw new Error('Access denied');
      },
      configurable: true,
    });

    expect(isLocalStorageAvailable()).toBe(false);

    // Restore localStorage
    Object.defineProperty(global.window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
  });
});

describe('clearAllViewPreferences', () => {
  test('clears all view preferences', () => {
    // Setup: save preferences for both tasks and projects
    const tasksPrefs = getDefaultPreferences('tasks');
    const projectsPrefs = getDefaultPreferences('projects');

    saveViewPreferences(STORAGE_KEYS.TASKS, tasksPrefs);
    saveViewPreferences(STORAGE_KEYS.PROJECTS, projectsPrefs);

    expect(localStorageMock.getItem(STORAGE_KEYS.TASKS)).toBeTruthy();
    expect(localStorageMock.getItem(STORAGE_KEYS.PROJECTS)).toBeTruthy();

    clearAllViewPreferences();

    expect(localStorageMock.getItem(STORAGE_KEYS.TASKS)).toBeNull();
    expect(localStorageMock.getItem(STORAGE_KEYS.PROJECTS)).toBeNull();
  });

  test('handles localStorage unavailable', () => {
    // Temporarily remove localStorage
    const originalLocalStorage = global.window.localStorage;
    delete (global.window as any).localStorage;

    // Should not throw
    expect(() => clearAllViewPreferences()).not.toThrow();

    // Restore localStorage
    (global.window as any).localStorage = originalLocalStorage;
  });
});

// ============================================================================
// Property-Based Tests (Conceptual - requires fast-check)
// ============================================================================

/*
 * NOTE: The following tests are conceptual and require the fast-check library.
 * To run these tests, install fast-check:
 *   npm install --save-dev fast-check
 * 
 * Then uncomment the tests below.
 */

/*
import * as fc from 'fast-check';

// Generators for property-based testing

const filterOperatorArb = fc.constantFrom(
  'equals',
  'not_equals',
  'contains',
  'in',
  'is_empty',
  'is_not_empty'
);

const filterConditionArb = fc.record({
  id: fc.string(),
  field: fc.string(),
  operator: filterOperatorArb,
  value: fc.anything(),
});

const sortRuleArb = fc.record({
  id: fc.string(),
  field: fc.string(),
  direction: fc.constantFrom('asc', 'desc'),
});

const viewPreferencesArb = fc.record({
  layout: fc.constantFrom('table', 'list'),
  visibleColumns: fc.array(fc.string(), { minLength: 1 }),
  filters: fc.array(filterConditionArb),
  sorts: fc.array(sortRuleArb),
  groupBy: fc.option(fc.constantFrom('project', null), { nil: undefined }),
  collapsedGroups: fc.option(fc.array(fc.string()), { nil: undefined }),
});

// Feature: notion-style-views, Property 1: View Preferences Serialization Round-Trip
describe('Property: Serialization Round-Trip', () => {
  test('parse(serialize(prefs)) equals prefs', () => {
    fc.assert(
      fc.property(viewPreferencesArb, (prefs) => {
        // Save and load
        const saved = saveViewPreferences(STORAGE_KEYS.TASKS, prefs);
        if (!saved) {
          // If save failed, preferences were invalid
          expect(validatePreferences(prefs)).toBe(false);
          return;
        }

        const loaded = loadViewPreferences(STORAGE_KEYS.TASKS);

        // Loaded preferences should equal original
        expect(loaded).toEqual(prefs);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: notion-style-views, Property: Validation Consistency
describe('Property: Validation Consistency', () => {
  test('valid preferences can be saved and loaded', () => {
    fc.assert(
      fc.property(viewPreferencesArb, (prefs) => {
        const isValid = validatePreferences(prefs);

        if (isValid) {
          // Should be able to save
          const saved = saveViewPreferences(STORAGE_KEYS.TASKS, prefs);
          expect(saved).toBe(true);

          // Should be able to load
          const loaded = loadViewPreferences(STORAGE_KEYS.TASKS);
          expect(loaded).not.toBeNull();
          expect(validatePreferences(loaded!)).toBe(true);
        } else {
          // Should not be able to save
          const saved = saveViewPreferences(STORAGE_KEYS.TASKS, prefs);
          expect(saved).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});
*/

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration: Save and Load Workflow', () => {
  test('complete workflow with tasks preferences', () => {
    // Start with defaults
    const defaults = getDefaultPreferences('tasks');
    expect(defaults).toBeTruthy();

    // Save defaults
    const saved = saveViewPreferences(STORAGE_KEYS.TASKS, defaults);
    expect(saved).toBe(true);

    // Load and verify
    const loaded = loadViewPreferences(STORAGE_KEYS.TASKS);
    expect(loaded).toEqual(defaults);

    // Modify preferences
    const modified: ViewPreferences = {
      ...loaded!,
      layout: 'list',
      filters: [
        {
          id: 'filter-1',
          field: 'status',
          operator: 'equals',
          value: 'Active',
        },
      ],
    };

    // Save modified
    const savedModified = saveViewPreferences(STORAGE_KEYS.TASKS, modified);
    expect(savedModified).toBe(true);

    // Load and verify modified
    const loadedModified = loadViewPreferences(STORAGE_KEYS.TASKS);
    expect(loadedModified).toEqual(modified);
  });

  test('tasks and projects preferences are independent', () => {
    const tasksPrefs = getDefaultPreferences('tasks');
    const projectsPrefs = getDefaultPreferences('projects');

    // Modify tasks preferences
    tasksPrefs.layout = 'list';
    tasksPrefs.filters = [
      {
        id: 'filter-1',
        field: 'status',
        operator: 'equals',
        value: 'Active',
      },
    ];

    // Save both
    saveViewPreferences(STORAGE_KEYS.TASKS, tasksPrefs);
    saveViewPreferences(STORAGE_KEYS.PROJECTS, projectsPrefs);

    // Load and verify independence
    const loadedTasks = loadViewPreferences(STORAGE_KEYS.TASKS);
    const loadedProjects = loadViewPreferences(STORAGE_KEYS.PROJECTS);

    expect(loadedTasks?.layout).toBe('list');
    expect(loadedTasks?.filters).toHaveLength(1);
    expect(loadedProjects?.layout).toBe('table');
    expect(loadedProjects?.filters).toHaveLength(0);
  });
});
