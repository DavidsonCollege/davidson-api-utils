const Raw = require('../lib/queryBuilder/raw')

test('instantiates raw sql', () => {
    expect(new Raw('test')).toBeDefined();
    expect(new Raw('test').constructor.name).toBe('Raw')
});
