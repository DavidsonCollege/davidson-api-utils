const Column = require('../lib/queryBuilder/column')

test('instantiates query builder', () => {
    expect(new Column()).toBeDefined();
});

test('correctly tests for valid string', () => {
    const column = new Column()
    expect(column.isValidString('test')).toBe(true);
    expect(column.isValidString('test as some_other')).toBe(true);
    expect(column.isValidString('test as [\'some other\']')).toBe(false);
    expect(column.isValidString('test this other')).toBe(false);
});

test('correctly tests for valid json path', () => {
    const column = new Column()
    expect(column.isValidJsonPath('$test')).toBe(false);
    expect(column.isValidJsonPath('test')).toBe(false);
    expect(column.isValidJsonPath('test as something')).toBe(false);
    expect(column.isValidJsonPath('$test.column.name.other[0].name')).toBe(true);
    expect(column.isValidJsonPath('$test.column:array')).toBe(true);
    expect(column.isValidJsonPath('$test.column:array:array')).toBe(false);
});

/*
test('correctly process table', () => {
    const column = new Column()
    const name = column.processTableAndAlias('table.column as col')
    expect(name).toBe('column');
    expect(column.table).toBe('table');
    expect(column.alias).toBe('col');

    const name2 = column.processTableAndAlias('table2.column2')
    expect(name2).toBe('column2');
    expect(column.table).toBe('table2');
    expect(column.alias).toBe(false);

    const name3 = column.processTableAndAlias('table3.$json.data')
    expect(name3).toBe('$json.data');
    expect(column.table).toBe('table3');
    expect(column.alias).toBe(false);
});

test('correctly process json path', () => {
    const column = new Column()
    const name = column.processJsonPath('$json.data.address[0].line:object');
    expect(name).toBe('data.address[0].line');
    expect(column.json).toBeDefined();
    expect(column.json.root).toBe('json')
    expect(column.json.type).toBe('object')

    const name2 = column.processJsonPath('$data.first_name');
    expect(name2).toBe('first_name');
    expect(column.json).toBeDefined();
    expect(column.json.root).toBe('data')
    expect(column.json.type).toBe('string')
});

test('correctly tests if a json path', () => {
    const column = new Column()
    expect(column.isJsonPath('$test')).toBe(true)
    expect(column.isJsonPath('test')).toBe(false)
});

test('correctly prepends a table', () => {
    const column = new Column('table.test')
    expect(column.prependTable()).toBe('table.')
    const column2 = new Column('test as t')
    expect(column2.prependTable()).toBe('')
});

test('correctly sets a json partial assignment', () => {
    const column = new Column('table.$data.test')
    expect(column.jsonPartialAssignment()).toBe("(table.data, '$.test')")
});

test('correctly sets an assignment', () => {
    const column = new Column('test as test')
    expect(column.assignment()).toBe("test")

    const column1 = new Column('table.$data.test as test')
    expect(column1.assignment()).toBe("JSON_VALUE(table.data, '$.test')")
});

test('correctly sets a selection', () => {
    const column = new Column('test as test')
    expect(column.selection()).toBe("test as test")

    const column1 = new Column('table.$data.test as test')
    expect(column1.selection()).toBe("JSON_VALUE(table.data, '$.test') as test")

    const column2 = new Column('table.$data.test')
    expect(column2.selection()).toBe("JSON_VALUE(table.data, '$.test') as test")
});

test('correctly sets a json cross apply', () => {
    const column1 = new Column('table.$data.test.to[0].object:array as test')
    const crossApply = {
        sql: "CROSS APPLY OPENJSON (table.data, '$.test.to[0].object') WITH (test_to_0__object_cross NVARCHAR(max) '$')",
        assignment: 'test_to_0__object_cross'
    }
    expect(column1.jsonCrossApply()).toStrictEqual(crossApply)

    const column2 = new Column('table.$data.test as test')
    expect(column2.jsonCrossApply()).toBe(false)
    expect(column2.json.normalized).toBe('test')
});

test('creates an all (*) column', () => {
    const column = new Column()
    expect(column.name).toBe('*');
});

test('throws an error with an invalid column name', () => {
    expect(() => {
        new Column('this is invalid')
    }).toThrow();
    expect(() => {
        new Column('$this')
    }).toThrow();
    expect(() => {
        new Column('$this.is:invalid:json')
    }).toThrow();
});

test('creates column', () => {
    const column = new Column('table.column as col')
    expect(column.name).toBe('column');
    expect(column.alias).toBe('col');
    expect(column.table).toBe('table');
});

test('creates a json column', () => {
    const column = new Column('table.$data.address.lines:array as addr')
    expect(column.name).toBe('address.lines');
    expect(column.alias).toBe('addr');
    expect(column.table).toBe('table');
    expect(column.json).toBeDefined();
    expect(column.json.root).toBe('data');
    expect(column.json.type).toBe('array');
});

test('constructs a selection argument', () => {
    const column = new Column('first_name as name')
    expect(column.selection()).toBe("first_name as name")

    const column2 = new Column('table.$data.address.lines:array as addr')
    expect(column2.selection()).toBe("JSON_QUERY(table.data, '$.address.lines') as addr")

    const column3 = new Column('$data.term as term_code')
    expect(column3.selection()).toBe("JSON_VALUE(data, '$.term') as term_code")
});*/
