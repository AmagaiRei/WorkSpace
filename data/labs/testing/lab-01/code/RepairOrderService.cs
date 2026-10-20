namespace DomainLibrary;

public class RepairOrderService
{
    private const int MinCount = 1;
    private const int MaxCount = 1000;
    private const decimal MinPrice = 0m;
    private const decimal MaxPrice = 100000m;

    private readonly List<RepairOrder> _orders = new List<RepairOrder>();
    private readonly List<RepairItem> _items = new List<RepairItem>();
    private int _nextOrderId = 1;
    private int _nextItemId = 1;

    public int AddRepairOrder(RepairOrder? data)
    {
        if (!IsOrderValid(data))
        {
            return 0;
        }

        RepairOrder order = new RepairOrder
        {
            Id = _nextOrderId,
            Number = data!.Number,
            DeviceName = data.DeviceName,
        };
        _nextOrderId++;
        _orders.Add(order);
        return order.Id;
    }

    public RepairOrder? GetRepairOrderById(int id)
    {
        RepairOrder? order = FindOrder(id);
        return order == null ? null : CopyOrder(order);
    }

    public List<RepairOrder> GetAllRepairOrder()
    {
        List<RepairOrder> result = new List<RepairOrder>();
        foreach (RepairOrder order in _orders)
        {
            result.Add(CopyOrder(order));
        }
        return result;
    }

    public bool UpdateRepairOrder(int id, RepairOrder? data)
    {
        RepairOrder? order = FindOrder(id);
        if (order == null || !IsOrderValid(data))
        {
            return false;
        }

        order.Number = data!.Number;
        order.DeviceName = data.DeviceName;
        return true;
    }

    public bool DeleteRepairOrder(int id)
    {
        RepairOrder? order = FindOrder(id);
        if (order == null || HasItems(id))
        {
            return false;
        }

        _orders.Remove(order);
        return true;
    }

    public int AddRepairItem(RepairItem? data)
    {
        if (!IsItemValid(data))
        {
            return 0;
        }

        RepairItem item = new RepairItem
        {
            Id = _nextItemId,
            RepairOrderId = data!.RepairOrderId,
            Title = data.Title,
            Quantity = data.Quantity,
            UnitPrice = data.UnitPrice,
        };
        _nextItemId++;
        _items.Add(item);
        return item.Id;
    }

    public RepairItem? GetRepairItemById(int id)
    {
        RepairItem? item = FindItem(id);
        return item == null ? null : CopyItem(item);
    }

    public List<RepairItem> GetAllRepairItem()
    {
        List<RepairItem> result = new List<RepairItem>();
        foreach (RepairItem item in _items)
        {
            result.Add(CopyItem(item));
        }
        return result;
    }

    public bool UpdateRepairItem(int id, RepairItem? data)
    {
        RepairItem? item = FindItem(id);
        if (item == null || !IsItemValid(data))
        {
            return false;
        }

        item.RepairOrderId = data!.RepairOrderId;
        item.Title = data.Title;
        item.Quantity = data.Quantity;
        item.UnitPrice = data.UnitPrice;
        return true;
    }

    public bool DeleteRepairItem(int id)
    {
        RepairItem? item = FindItem(id);
        if (item == null)
        {
            return false;
        }

        _items.Remove(item);
        return true;
    }

    public List<RepairItem> GetRepairItems(int parentId)
    {
        List<RepairItem> result = new List<RepairItem>();
        foreach (RepairItem item in _items)
        {
            if (item.RepairOrderId == parentId)
            {
                result.Add(CopyItem(item));
            }
        }
        return result;
    }

    public decimal GetRepairTotal(int parentId)
    {
        decimal total = 0m;
        foreach (RepairItem item in _items)
        {
            if (item.RepairOrderId == parentId)
            {
                total += item.Quantity * item.UnitPrice;
            }
        }
        return total;
    }

    public bool MoveRepairItem(int id, int newParentId)
    {
        RepairItem? item = FindItem(id);
        if (item == null || FindOrder(newParentId) == null)
        {
            return false;
        }

        item.RepairOrderId = newParentId;
        return true;
    }

    private bool IsOrderValid(RepairOrder? data)
    {
        return data != null
            && !string.IsNullOrWhiteSpace(data.Number)
            && !string.IsNullOrWhiteSpace(data.DeviceName);
    }

    private bool IsItemValid(RepairItem? data)
    {
        return data != null
            && !string.IsNullOrWhiteSpace(data.Title)
            && data.Quantity >= MinCount
            && data.Quantity <= MaxCount
            && data.UnitPrice >= MinPrice
            && data.UnitPrice <= MaxPrice
            && FindOrder(data.RepairOrderId) != null;
    }

    private bool HasItems(int orderId)
    {
        foreach (RepairItem item in _items)
        {
            if (item.RepairOrderId == orderId)
            {
                return true;
            }
        }
        return false;
    }

    private RepairOrder? FindOrder(int id)
    {
        foreach (RepairOrder order in _orders)
        {
            if (order.Id == id)
            {
                return order;
            }
        }
        return null;
    }

    private RepairItem? FindItem(int id)
    {
        foreach (RepairItem item in _items)
        {
            if (item.Id == id)
            {
                return item;
            }
        }
        return null;
    }

    private RepairOrder CopyOrder(RepairOrder source)
    {
        return new RepairOrder
        {
            Id = source.Id,
            Number = source.Number,
            DeviceName = source.DeviceName,
        };
    }

    private RepairItem CopyItem(RepairItem source)
    {
        return new RepairItem
        {
            Id = source.Id,
            RepairOrderId = source.RepairOrderId,
            Title = source.Title,
            Quantity = source.Quantity,
            UnitPrice = source.UnitPrice,
        };
    }
}
