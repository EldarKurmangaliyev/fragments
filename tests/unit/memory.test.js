const {
  writeFragment,
  readFragment,
  writeFragmentData,
  readFragmentData,
} = require('../../src/model/data/memory'); // Adjust this path based on your project structure

describe('Memory Data Handling', () => {
  describe('Fragment Metadata Handling', () => {
    test('writeFragment and readFragment work correctly', async () => {
      const fragment = {
        ownerId: 'testOwner',
        id: 'testId',
        metadata: 'sampleMetadata',
      };

      await writeFragment(fragment);
      const retrievedFragment = await readFragment(fragment.ownerId, fragment.id);

      expect(retrievedFragment).toEqual(fragment);
    });

    test('readFragment returns undefined for non-existent data', async () => {
      const result = await readFragment('nonexistentOwner', 'nonexistentId');
      expect(result).toBeUndefined();
    });
  });

  describe('Fragment Data Handling', () => {
    test('writeFragmentData and readFragmentData work correctly', async () => {
      const ownerId = 'testOwner';
      const id = 'testId';
      const buffer = Buffer.from('sampleData');

      await writeFragmentData(ownerId, id, buffer);
      const retrievedBuffer = await readFragmentData(ownerId, id);

      expect(retrievedBuffer).toEqual(buffer);
    });

    test('readFragmentData returns undefined for non-existent data', async () => {
      const result = await readFragmentData('nonexistentOwner', 'nonexistentId');
      expect(result).toBeUndefined();
    });
  });
});
