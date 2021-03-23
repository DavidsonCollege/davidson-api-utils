const Where = require('../lib/queryBuilder/where')
const Raw = require('../lib/queryBuilder/raw')

test('constructor test', () => {
   expect(() => {
       new Where('where')
   }).not.toThrow()

    expect(() => {
        new Where('where', true)
    }).not.toThrow()

    expect(() => {
        new Where('where', false, true)
    }).not.toThrow()
})

test('init test', () => {
    const where = new Where('where')
    expect(() => {
        where.init('subject_code', 'bio')
    }).not.toThrow()
});

test('throws error on bad where type', () => {
    const where = new Where('bad')
    expect(() => {
        where.init('subject_code', 'bio')
    }).toThrow()
});


test('where', () => {
    const type = 'where'
    let w = new Where(type)
    w.init('col', 2)
    expect(w.andOr).toBe('AND')
    expect(w.sql).toBe('col = 2');
    w.init('col', 'test')
    expect(w.sql).toBe("col = 'test'");

    w = new Where(type, true)
    expect(w.andOr).toBe('OR')

    w = new Where(type, false, true)
    w.init('col', 2)
    expect(w.sql).toBe('NOT col = 2');
    w.init('col', 'test')
    expect(w.sql).toBe("NOT col = 'test'");

    w = new Where(type)
    w.init('$data.test', 2)
    expect(w.sql).toBe("JSON_VALUE(data, '$.test') = 2");
    w.init('$data.test.', 2)
    expect(w.sql).toBe("JSON_QUERY(data, '$.test') = 2");
    w.init('$data.test[*]', 2)
    expect(w.sql).toBe("x_data_test = 2");
    w.init('$data.test[*].nested[*].splat', 2)
    expect(w.sql).toBe("x_data_test_nested_splat = 2");
});

test('three arg wheres', () => {
    const type = 'where'
    let w = new Where(type)
    w.init('col', '<>', 2)
    expect(w.sql).toBe('col <> 2');
    w.init('col', '!=', 'test')
    expect(w.sql).toBe("col != 'test'");
    w.init('col', '>', '2')
    expect(w.sql).toBe("col > '2'");

    w = new Where(type, false, true)
    w.init('col', '>', '2')
    expect(w.sql).toBe("NOT col > '2'");
});


test('where betweens', () => {
    const type = 'between'
    let w = new Where(type)
    w.init('col', [1, 2])
    expect(w.sql).toBe('col BETWEEN 1 AND 2');
    w.init('col', ['2020', '2021'])
    expect(w.sql).toBe("col BETWEEN '2020' AND '2021'");

    w = new Where(type, false, true)
    w.init('col', [1, 100])
    expect(w.sql).toBe("col NOT BETWEEN 1 AND 100");
});

test('where ins', () => {
    const type = 'in'
    let w = new Where(type)
    w.init('col', [1, 2, 3])
    expect(w.sql).toBe('col IN (1,2,3)');
    w.init('col', ['2020', '2021', '2022'])
    expect(w.sql).toBe("col IN ('2020','2021','2022')");

    w = new Where(type, false, true)
    w.init('col', [1, 100])
    expect(w.sql).toBe("col NOT IN (1,100)");

    w = new Where(type)
    w.init('$data.target[0].arr[*]', [1, 2, 3])
    expect(w.sql).toBe('x_data_target_0_arr IN (1,2,3)');
});

test('where nulls', () => {
    const type = 'null'
    let w = new Where(type)
    w.init('col')
    expect(w.sql).toBe('col IS NULL');

    w = new Where(type, false, true)
    w.init('col')
    expect(w.sql).toBe("col IS NOT NULL");
});
