const QueryBuilder = require('../lib/queryBuilder/queryBuilder')
const Raw = require('../lib/queryBuilder/raw')

test('selection tests', () => {
    const qb = new QueryBuilder('courses')

    // bogus column
    expect(() => {
        qb.select('bad column name')
    }).toThrow();

    // multiple columns
    qb.select(['column1', 'col2 as column2', '$data.column3'])
    expect(qb.selections).toBe("column1, col2 as column2, JSON_VALUE(data, '$.column3') as column3")

});


test('creates a where group', () => {
    const qb = new QueryBuilder('courses')
    const wheres = [
        ['where', ['col', 2]],
        ['whereBetween', ['col', [1, 2]]],
        ['whereIn', ['col', [1, 2]]],
        ['whereNull', ['col']],
        ['orWhereNotGroup', [
            ['where', ['col', 3]],
            ['orWhereNotIn', ['col', [1,2,3,4,5]]]
        ]]
    ]
    qb.wheres.push(qb.createWhereGroup(wheres))
    expect(qb.whereSql(qb.wheres)).toBe("WHERE (col = 2 AND col BETWEEN 1 AND 2 AND col IN (1,2) AND col IS NULL OR NOT (col = 3 OR col NOT IN (1,2,3,4,5)))")
});


test('order by sql', () => {
    const qb = new QueryBuilder('courses')
    qb.addOrderBy('test', 'desc')
    expect(qb.orderBySql()).toBe("test DESC")

    qb.addOrderBy('test2', 'asc')
    expect(qb.orderBySql()).toBe("test DESC, test2")
});

test('offset', () => {
    const qb = new QueryBuilder('courses')

    qb.select()
    qb.setOffset(10)
    expect(qb.sql()).toBe("SELECT * FROM courses ORDER BY courses._id OFFSET 10 ROWS FETCH NEXT 100 ROWS ONLY")

});

test('limit', () => {
    const qb = new QueryBuilder('courses')

    qb.select()
    qb.setLimit(10)
    expect(qb.sql()).toBe("SELECT * FROM courses ORDER BY courses._id OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY")

});
