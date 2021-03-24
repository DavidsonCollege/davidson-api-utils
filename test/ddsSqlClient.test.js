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

test('creates sql', () => {
    const client = new DdsSqlClient({})
    client.query('courses')
        .select('data')
        .whereIn('$data.notes[*]', ['i', 'h'])
        .whereIn('$data.grad_requirements[*]', ['jec'])
    expect(client.qb.sql()).toBe("SELECT data FROM courses " +
        "CROSS APPLY OPENJSON(data, '$.notes') WITH (x_data_notes NVARCHAR(max) '$') " +
        "CROSS APPLY OPENJSON(data, '$.grad_requirements') " +
        "WITH (x_data_grad_requirements NVARCHAR(max) '$') " +
        "WHERE x_data_notes IN ('i','h') " +
        "AND x_data_grad_requirements IN ('jec') " +
        "ORDER BY courses._id OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY")
});

test('creates sql with null where', () => {
    const client = new DdsSqlClient({})
    client.query('courses')
        .select('data')
    expect(client.qb.sql()).toBe("SELECT data FROM courses ORDER BY courses._id OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY")
});


test('correctly orders', () => {
    const client = new DdsSqlClient({})
    client.query('courses')
        .select('data')
        .orderByDesc('test')
    expect(client.qb.sql()).toBe("SELECT data FROM courses ORDER BY test DESC OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY")
});
