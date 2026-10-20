namespace ConsoleApp05
{
    /// <summary>Абонент домашнего интернета. Знает только свои данные и формулу оплаты.</summary>
    public class Subscriber
    {
        public const decimal BaseFee = 600m;
        public const decimal PenaltyFee = 300m;
        public const double GigabyteLimit = 100;

        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public double Gigabytes { get; set; }
        public int DaysLate { get; set; }

        public decimal CalculateTotal()
        {
            decimal total = BaseFee;

            // Штраф начисляется один раз, даже если выполнены оба условия.
            if (Gigabytes > GigabyteLimit || DaysLate > 0)
            {
                total += PenaltyFee;
            }

            return total;
        }
    }
}
