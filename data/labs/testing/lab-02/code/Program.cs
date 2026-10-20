using System.Globalization;
using System.Text;
using Microsoft.Data.Sqlite;

namespace ConsoleApp05
{
    class Program
    {
        static void Main()
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.InputEncoding = Encoding.UTF8;

            string dbPath = Path.Combine(AppContext.BaseDirectory, "internet.db");
            var repository = new SubscriberRepository(dbPath);

            try
            {
                repository.Initialize();
                RunMenu(repository);
            }
            catch (EndOfStreamException)
            {
                Console.WriteLine("\nВвод закрыт, завершение работы.");
            }
            catch (SqliteException ex)
            {
                Console.WriteLine($"Ошибка базы данных: {ex.Message}");
            }
        }

        static void RunMenu(SubscriberRepository repository)
        {
            Console.WriteLine("Программа расчета оплаты за домашний интернет");

            while (true)
            {
                Console.WriteLine();
                Console.WriteLine("1. Добавить абонента");
                Console.WriteLine("2. Показать абонента по Id и рассчитать оплату");
                Console.WriteLine("3. Показать всех абонентов");
                Console.WriteLine("4. Изменить данные абонента по Id");
                Console.WriteLine("0. Выход");

                string choice = ConsoleInput.ReadString("Выберите пункт: ");

                switch (choice)
                {
                    case "1":
                        AddSubscriber(repository);
                        break;
                    case "2":
                        ShowSubscriber(repository);
                        break;
                    case "3":
                        ShowAll(repository);
                        break;
                    case "4":
                        EditSubscriber(repository);
                        break;
                    case "0":
                        return;
                    default:
                        Console.WriteLine("Нет такого пункта меню.");
                        break;
                }
            }
        }

        static void AddSubscriber(SubscriberRepository repository)
        {
            var subscriber = new Subscriber
            {
                Name = ConsoleInput.ReadString("Имя абонента: "),
                Gigabytes = ConsoleInput.ReadDouble("Израсходовано гигабайт: ", 0),
                DaysLate = ConsoleInput.ReadInt("Дней просрочки: ", 0),
            };

            int id = repository.Add(subscriber);
            Console.WriteLine($"Абонент добавлен. Его Id: {id}");
        }

        static void ShowSubscriber(SubscriberRepository repository)
        {
            int id = ConsoleInput.ReadInt("Введите Id абонента: ", 1);
            Subscriber? subscriber = repository.GetById(id);

            if (subscriber is null)
            {
                Console.WriteLine($"Абонент с Id {id} не найден.");
                return;
            }

            decimal total = subscriber.CalculateTotal();

            Console.WriteLine("____________________________________");
            Console.WriteLine($"Id:               {subscriber.Id}");
            Console.WriteLine($"Абонент:          {subscriber.Name}");
            Console.WriteLine(
                $"Трафик:           {subscriber.Gigabytes.ToString(CultureInfo.CurrentCulture)} ГБ"
            );
            Console.WriteLine($"Просрочка:        {subscriber.DaysLate} дн.");
            Console.WriteLine($"Итоговая сумма:   {total:0.00} руб.");
            Console.WriteLine("____________________________________");
        }

        static void EditSubscriber(SubscriberRepository repository)
        {
            int id = ConsoleInput.ReadInt("Введите Id абонента для изменения: ", 1);
            Subscriber? subscriber = repository.GetById(id);

            if (subscriber is null)
            {
                Console.WriteLine($"Абонент с Id {id} не найден.");
                return;
            }

            Console.WriteLine("Нажмите Enter, чтобы оставить значение без изменений.");
            subscriber.Name = ConsoleInput.ReadStringOrKeep("Имя ", subscriber.Name);
            subscriber.Gigabytes = ConsoleInput.ReadDoubleOrKeep(
                "Гигабайт ",
                0,
                subscriber.Gigabytes
            );
            subscriber.DaysLate = ConsoleInput.ReadIntOrKeep(
                "Дней просрочки ",
                0,
                subscriber.DaysLate
            );

            if (repository.Update(subscriber))
            {
                Console.WriteLine(
                    $"Данные абонента {id} обновлены. Новая сумма: {subscriber.CalculateTotal():0.00} руб."
                );
            }
            else
            {
                // Запись могли удалить между чтением и записью (например, другим процессом).
                Console.WriteLine("Не удалось обновить: запись больше не существует.");
            }
        }

        static void ShowAll(SubscriberRepository repository)
        {
            List<Subscriber> subscribers = repository.GetAll();

            if (subscribers.Count == 0)
            {
                Console.WriteLine("В базе пока нет абонентов.");
                return;
            }

            foreach (Subscriber s in subscribers)
            {
                Console.WriteLine($"{s.Id, 4}  {s.Name}");
            }
        }
    }
}
