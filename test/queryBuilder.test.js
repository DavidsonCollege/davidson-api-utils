const QueryBuilder = require('../lib/queryBuilder/queryBuilder')

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
