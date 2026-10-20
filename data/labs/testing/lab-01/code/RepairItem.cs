namespace DomainLibrary;

public class RepairItem
{
    public int Id { get; set; }
    public int RepairOrderId { get; set; }
    public string Title { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
