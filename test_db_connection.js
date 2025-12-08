// Quick database connection test
require('dotenv').config();

const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME || "localhost",
        user: process.env.RDS_USERNAME || "postgres",
        password: process.env.RDS_PASSWORD || "admin",
        database: process.env.RDS_DB_NAME || "project3",
        port: process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
    }
});

console.log("\n=== Database Connection Test ===\n");
console.log("Connecting to database with:");
console.log("  Host:", process.env.RDS_HOSTNAME || "localhost");
console.log("  User:", process.env.RDS_USERNAME || "postgres");
console.log("  Database:", process.env.RDS_DB_NAME || "project3");
console.log("  Port:", process.env.RDS_PORT || 5432);
console.log("\nTesting connection...\n");

async function testDatabase() {
    try {
        // Test connection
        await knex.raw('SELECT 1');
        console.log("✓ Database connection successful!\n");

        // Check if users table exists
        const tablesExist = await knex.raw(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log("=== Tables in database ===");
        if (tablesExist.rows.length === 0) {
            console.log("⚠ No tables found! You need to run setup_database.sql\n");
        } else {
            tablesExist.rows.forEach(row => {
                console.log("  -", row.table_name);
            });
            console.log();
        }

        // Check users table structure if it exists
        const hasUsers = tablesExist.rows.some(row => row.table_name === 'users');
        if (hasUsers) {
            const columns = await knex.raw(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            `);

            console.log("=== Users table columns ===");
            columns.rows.forEach(col => {
                console.log(`  - ${col.column_name} (${col.data_type})`);
            });
            console.log();

            // Check if userid column exists
            const hasUserid = columns.rows.some(col => col.column_name === 'userid');
            if (!hasUserid) {
                console.log("⚠ ERROR: Users table has 'id' instead of 'userid'");
                console.log("   Solution: Run this SQL command:");
                console.log("   ALTER TABLE users RENAME COLUMN id TO userid;\n");
            } else {
                console.log("✓ Users table has correct 'userid' column\n");
            }
        } else {
            console.log("⚠ Users table does not exist! Run setup_database.sql\n");
        }

        // Check other required tables
        const requiredTables = ['categories', 'resources', 'user_resource', 'roles'];
        const missingTables = requiredTables.filter(table =>
            !tablesExist.rows.some(row => row.table_name === table)
        );

        if (missingTables.length > 0) {
            console.log("=== Missing tables ===");
            missingTables.forEach(table => {
                console.log("  ⚠", table);
            });
            console.log("\nSolution: Run setup_database.sql to create all tables\n");
        } else {
            console.log("✓ All required tables exist!\n");

            // Check if resources are populated
            const resourceCount = await knex('resources').count('* as count');
            const categoryCount = await knex('categories').count('* as count');

            console.log("=== Resource data ===");
            console.log("  Categories:", categoryCount[0].count);
            console.log("  Resources:", resourceCount[0].count);

            if (categoryCount[0].count === '0' || resourceCount[0].count === '0') {
                console.log("\n⚠ No resources found! Run populate_resources.sql\n");
            } else {
                console.log("\n✓ Resources are populated!\n");
            }
        }

        console.log("=== Next Steps ===");
        if (missingTables.length > 0 || !hasUsers) {
            console.log("1. Run: psql -U postgres -d project3 -f setup_database.sql");
            console.log("2. Run: psql -U postgres -d project3 -f populate_resources.sql");
        } else if (!hasUsers || columns.rows.some(col => col.column_name === 'id')) {
            console.log("1. Fix users table: ALTER TABLE users RENAME COLUMN id TO userid;");
        } else {
            console.log("✓ Database is ready! You can now:");
            console.log("  - Start server: npm start");
            console.log("  - Register: http://localhost:3000/register");
        }
        console.log();

    } catch (error) {
        console.log("✗ Database connection failed!");
        console.log("\nError:", error.message);
        console.log("\nPossible solutions:");
        console.log("1. Make sure PostgreSQL is running");
        console.log("2. Check your .env file has correct password");
        console.log("3. Make sure database 'project3' exists");
        console.log("   Create it with: psql -U postgres -c 'CREATE DATABASE project3;'");
        console.log();
    } finally {
        await knex.destroy();
        process.exit();
    }
}

testDatabase();
