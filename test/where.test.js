const Where = require('../lib/queryBuilder/where')
const Raw = require('../lib/queryBuilder/raw')

test('basic wheres', () => {
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

});

test('there arg wheres', () => {
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

    const raw = new Raw('SELECT id FROM table WHERE id = 1')
    w.init('col', raw)
    expect(w.sql).toBe(`col NOT IN (${raw.sql})`);

    w = new Where(type)
    w.init('$data.target[0].arr:array', [1, 2, 3])
    expect(w.sql).toBe('target_0__arr IN (1,2,3)');
    expect(w.crossApplySql).toBe("CROSS APPLY OPENJSON (data, '$.target[0].arr') WITH (target_0__arr NVARCHAR(max) '$')");
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
