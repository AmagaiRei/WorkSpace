using Microsoft.Data.Sqlite;

namespace ConsoleApp05
{
    /// <summary>Единственное место программы, которое работает с SQL.</summary>
    public class SubscriberRepository
    {
        private readonly string _connectionString;

        public SubscriberRepository(string dbPath)
        {
            _connectionString = $"Data Source={dbPath}";
        }

        public void Initialize()
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = """
                CREATE TABLE IF NOT EXISTS Subscribers (
                    Id        INTEGER PRIMARY KEY AUTOINCREMENT,
                    Name      TEXT    NOT NULL,
                    Gigabytes REAL    NOT NULL CHECK (Gigabytes >= 0),
                    DaysLate  INTEGER NOT NULL CHECK (DaysLate >= 0)
                );
                """;
            command.ExecuteNonQuery();
        }

        /// <returns>Id, который БД присвоила новой записи.</returns>
        public int Add(Subscriber subscriber)
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO Subscribers (Name, Gigabytes, DaysLate)
                VALUES (@name, @gigabytes, @daysLate);
                SELECT last_insert_rowid();
                """;
            command.Parameters.AddWithValue("@name", subscriber.Name);
            command.Parameters.AddWithValue("@gigabytes", subscriber.Gigabytes);
            command.Parameters.AddWithValue("@daysLate", subscriber.DaysLate);

            return Convert.ToInt32(command.ExecuteScalar());
        }

        /// <returns>true, если запись с таким Id существовала и была перезаписана.</returns>
        public bool Update(Subscriber subscriber)
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE Subscribers
                SET Name = @name, Gigabytes = @gigabytes, DaysLate = @daysLate
                WHERE Id = @id
                """;
            command.Parameters.AddWithValue("@name", subscriber.Name);
            command.Parameters.AddWithValue("@gigabytes", subscriber.Gigabytes);
            command.Parameters.AddWithValue("@daysLate", subscriber.DaysLate);
            command.Parameters.AddWithValue("@id", subscriber.Id);

            // ExecuteNonQuery возвращает число затронутых строк: 0 - такого Id нет.
            return command.ExecuteNonQuery() > 0;
        }

        /// <returns>Абонент или null, если записи с таким Id нет.</returns>
        public Subscriber? GetById(int id)
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT Id, Name, Gigabytes, DaysLate FROM Subscribers WHERE Id = @id";
            command.Parameters.AddWithValue("@id", id);

            using var reader = command.ExecuteReader();
            return reader.Read() ? Map(reader) : null;
        }

        public List<Subscriber> GetAll()
        {
            var result = new List<Subscriber>();

            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT Id, Name, Gigabytes, DaysLate FROM Subscribers ORDER BY Id";

            using var reader = command.ExecuteReader();
            while (reader.Read())
            {
                result.Add(Map(reader));
            }

            return result;
        }

        private SqliteConnection OpenConnection()
        {
            var connection = new SqliteConnection(_connectionString);
            connection.Open();
            return connection;
        }

        private static Subscriber Map(SqliteDataReader reader) =>
            new()
            {
                Id = reader.GetInt32(0),
                Name = reader.GetString(1),
                Gigabytes = reader.GetDouble(2),
                DaysLate = reader.GetInt32(3),
            };
    }
}
