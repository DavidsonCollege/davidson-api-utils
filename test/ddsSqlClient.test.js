const DdsSqlClient = require('../lib/ddsSqlClient')

const config = {
    user: 'test',
    password: 'test',
    server: 'test',
    database: 'test',
    options: {
        enableArithAbort: true
    }
}

test('throws error with bad config', () => {
    const client = new DdsSqlClient({})
    client.query('courses')
        .select('data')
        .whereIn('$data.notes:array', ['i', 'h'])
        .whereIn('$data.grad_requirements:array', ['jec'])
    expect(client.qb.sql()).toBe('column')
});
