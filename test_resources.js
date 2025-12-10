require('dotenv').config();

const knex = require('knex')({
    client: 'pg',
    connection: {
        host: process.env.RDS_HOSTNAME || 'localhost',
        user: process.env.RDS_USERNAME || 'postgres',
        password: process.env.RDS_PASSWORD || 'admin',
        database: process.env.RDS_DB_NAME || 'project3',
        port: process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
    }
});

knex('resource')
    .select('resource.resourceid', 'resource.resourcename', 'resource.resourceurl', 'resource.resourcephone', 'resource.resourcedesc', 'category.categoryname', 'category.categoryid')
    .leftJoin('category', 'resource.categoryid', 'category.categoryid')
    .where('resource.submittedby_userid', null)
    .orderBy('category.categoryid')
    .then(resources => {
        console.log('Total resources:', resources.length);
        const categories = {};
        resources.forEach(resource => {
            const categoryName = resource.categoryname || 'Uncategorized';
            if (!categories[categoryName]) {
                categories[categoryName] = [];
            }
            categories[categoryName].push(resource);
        });
        console.log('\nCategories:', Object.keys(categories));
        Object.keys(categories).forEach(cat => {
            console.log('  ' + cat + ':', categories[cat].length, 'resources');
        });
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
