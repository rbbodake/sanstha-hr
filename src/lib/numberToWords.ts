export function numberToWordsINR(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else {
      str += a[n];
    }
    return str.trim();
  }

  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const hundreds = Math.floor((num % 1000) / 100);
  const remainder = Math.floor(num % 100);

  let res = '';
  if (crores > 0) res += inWords(crores) + ' Crore ';
  if (lakhs > 0) res += inWords(lakhs) + ' Lakh ';
  if (thousands > 0) res += inWords(thousands) + ' Thousand ';
  if (hundreds > 0) res += inWords(hundreds) + ' Hundred ';
  if (remainder > 0) res += inWords(remainder) + ' ';

  return (res.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}
