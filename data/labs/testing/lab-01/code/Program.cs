using System.Globalization;
using DomainLibrary;

namespace ConsoleApp;

public class Program
{
    private static readonly RepairOrderService Service = new RepairOrderService();

    public static void Main()
    {
        bool running = true;
        while (running)
        {
            PrintMenu();
            string? choice = Console.ReadLine();
            Console.WriteLine();
            running = HandleChoice(choice);
            Console.WriteLine();
        }
    }

    private static void PrintMenu()
    {
        Console.WriteLine("=== Ремонтные заказы ===");
        Console.WriteLine("1  - Добавить заказ");
        Console.WriteLine("2  - Показать все заказы");
        Console.WriteLine("3  - Найти заказ по Id");
        Console.WriteLine("4  - Изменить заказ");
        Console.WriteLine("5  - Удалить заказ");
        Console.WriteLine("6  - Добавить позицию");
        Console.WriteLine("7  - Показать все позиции");
        Console.WriteLine("8  - Найти позицию по Id");
        Console.WriteLine("9  - Изменить позицию");
        Console.WriteLine("10 - Удалить позицию");
        Console.WriteLine("11 - Позиции заказа");
        Console.WriteLine("12 - Стоимость заказа");
        Console.WriteLine("13 - Перенести позицию в другой заказ");
        Console.WriteLine("0  - Выход");
        Console.Write("Выбор: ");
    }

    private static bool HandleChoice(string? choice)
    {
        switch (choice)
        {
            case "1":
                AddOrder();
                break;
            case "2":
                ShowAllOrders();
                break;
            case "3":
                ShowOrderById();
                break;
            case "4":
                UpdateOrder();
                break;
            case "5":
                DeleteOrder();
                break;
            case "6":
                AddItem();
                break;
            case "7":
                ShowAllItems();
                break;
            case "8":
                ShowItemById();
                break;
            case "9":
                UpdateItem();
                break;
            case "10":
                DeleteItem();
                break;
            case "11":
                ShowOrderItems();
                break;
            case "12":
                ShowOrderTotal();
                break;
            case "13":
                MoveItem();
                break;
            case "0":
                return false;
            default:
                Console.WriteLine("Неизвестный пункт меню.");
                break;
        }
        return true;
    }

    private static void AddOrder()
    {
        RepairOrder order = ReadOrder();
        int id = Service.AddRepairOrder(order);
        Console.WriteLine(
            id == 0 ? "Ошибка: данные заказа некорректны." : $"Заказ добавлен, Id = {id}."
        );
    }

    private static void ShowAllOrders()
    {
        List<RepairOrder> orders = Service.GetAllRepairOrder();
        if (orders.Count == 0)
        {
            Console.WriteLine("Заказов нет.");
            return;
        }

        foreach (RepairOrder order in orders)
        {
            PrintOrder(order);
        }
    }

    private static void ShowOrderById()
    {
        if (!TryReadInt("Id заказа: ", out int id))
        {
            return;
        }

        RepairOrder? order = Service.GetRepairOrderById(id);
        if (order == null)
        {
            Console.WriteLine("Заказ не найден.");
            return;
        }

        PrintOrder(order);
    }

    private static void UpdateOrder()
    {
        if (!TryReadInt("Id заказа: ", out int id))
        {
            return;
        }

        RepairOrder order = ReadOrder();
        Console.WriteLine(
            Service.UpdateRepairOrder(id, order) ? "Заказ изменён." : "Ошибка: заказ не изменён."
        );
    }

    private static void DeleteOrder()
    {
        if (!TryReadInt("Id заказа: ", out int id))
        {
            return;
        }

        Console.WriteLine(
            Service.DeleteRepairOrder(id)
                ? "Заказ удалён."
                : "Ошибка: заказ не найден или в нём есть позиции."
        );
    }

    private static void AddItem()
    {
        if (!TryReadItem(out RepairItem item))
        {
            return;
        }

        int id = Service.AddRepairItem(item);
        Console.WriteLine(
            id == 0 ? "Ошибка: данные позиции некорректны." : $"Позиция добавлена, Id = {id}."
        );
    }

    private static void ShowAllItems()
    {
        List<RepairItem> items = Service.GetAllRepairItem();
        if (items.Count == 0)
        {
            Console.WriteLine("Позиций нет.");
            return;
        }

        foreach (RepairItem item in items)
        {
            PrintItem(item);
        }
    }

    private static void ShowItemById()
    {
        if (!TryReadInt("Id позиции: ", out int id))
        {
            return;
        }

        RepairItem? item = Service.GetRepairItemById(id);
        if (item == null)
        {
            Console.WriteLine("Позиция не найдена.");
            return;
        }

        PrintItem(item);
    }

    private static void UpdateItem()
    {
        if (!TryReadInt("Id позиции: ", out int id))
        {
            return;
        }

        if (!TryReadItem(out RepairItem item))
        {
            return;
        }

        Console.WriteLine(
            Service.UpdateRepairItem(id, item)
                ? "Позиция изменена."
                : "Ошибка: позиция не изменена."
        );
    }

    private static void DeleteItem()
    {
        if (!TryReadInt("Id позиции: ", out int id))
        {
            return;
        }

        Console.WriteLine(
            Service.DeleteRepairItem(id) ? "Позиция удалена." : "Ошибка: позиция не найдена."
        );
    }

    private static void ShowOrderItems()
    {
        if (!TryReadInt("Id заказа: ", out int parentId))
        {
            return;
        }

        List<RepairItem> items = Service.GetRepairItems(parentId);
        if (items.Count == 0)
        {
            Console.WriteLine("Позиций нет.");
            return;
        }

        foreach (RepairItem item in items)
        {
            PrintItem(item);
        }
    }

    private static void ShowOrderTotal()
    {
        if (!TryReadInt("Id заказа: ", out int parentId))
        {
            return;
        }

        Console.WriteLine($"Стоимость заказа: {Service.GetRepairTotal(parentId)}");
    }

    private static void MoveItem()
    {
        if (!TryReadInt("Id позиции: ", out int id))
        {
            return;
        }

        if (!TryReadInt("Id нового заказа: ", out int newParentId))
        {
            return;
        }

        Console.WriteLine(
            Service.MoveRepairItem(id, newParentId)
                ? "Позиция перенесена."
                : "Ошибка: позиция или заказ не найдены."
        );
    }

    private static RepairOrder ReadOrder()
    {
        return new RepairOrder
        {
            Number = ReadText("Номер заказа: "),
            DeviceName = ReadText("Устройство: "),
        };
    }

    private static bool TryReadItem(out RepairItem item)
    {
        item = new RepairItem();

        if (!TryReadInt("Id заказа: ", out int orderId))
        {
            return false;
        }

        string title = ReadText("Название работы или детали: ");

        if (!TryReadInt("Количество: ", out int quantity))
        {
            return false;
        }

        if (!TryReadDecimal("Цена единицы: ", out decimal unitPrice))
        {
            return false;
        }

        item = new RepairItem
        {
            RepairOrderId = orderId,
            Title = title,
            Quantity = quantity,
            UnitPrice = unitPrice,
        };
        return true;
    }

    private static string ReadText(string prompt)
    {
        Console.Write(prompt);
        return Console.ReadLine() ?? "";
    }

    private static bool TryReadInt(string prompt, out int value)
    {
        Console.Write(prompt);
        if (int.TryParse(Console.ReadLine(), out value))
        {
            return true;
        }

        Console.WriteLine("Ошибка: нужно ввести целое число.");
        return false;
    }

    private static bool TryReadDecimal(string prompt, out decimal value)
    {
        Console.Write(prompt);
        string text = (Console.ReadLine() ?? "").Replace(',', '.');
        if (decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out value))
        {
            return true;
        }

        Console.WriteLine("Ошибка: нужно ввести число.");
        return false;
    }

    private static void PrintOrder(RepairOrder order)
    {
        Console.WriteLine(
            $"Id: {order.Id} | Номер: {order.Number} | Устройство: {order.DeviceName}"
        );
    }

    private static void PrintItem(RepairItem item)
    {
        Console.WriteLine(
            $"Id: {item.Id} | RepairOrderId: {item.RepairOrderId} | Название: {item.Title} | "
                + $"Количество: {item.Quantity} | Цена: {item.UnitPrice}"
        );
    }
}
