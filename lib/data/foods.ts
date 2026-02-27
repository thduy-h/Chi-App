export type FoodCategory = 'com' | 'pho' | 'mi' | 'bun' | 'lau' | 'doUong' | 'anVat'

export interface FoodItem {
  id: number
  name: string
  category: FoodCategory
  priceRange: string
  note?: string
  image?: string
}

export const FOOD_CATEGORIES: { value: FoodCategory; label: string }[] = [
  { value: 'com', label: 'Cơm' },
  { value: 'pho', label: 'Phở' },
  { value: 'mi', label: 'Mì' },
  { value: 'bun', label: 'Bún' },
  { value: 'lau', label: 'Lẩu' },
  { value: 'doUong', label: 'Đồ uống' },
  { value: 'anVat', label: 'Ăn vặt' }
]

export const FOODS: FoodItem[] = [
  {
    id: 1,
    name: 'Cơm tấm sườn bì chả',
    category: 'com',
    priceRange: '45.000đ - 65.000đ',
    note: 'Thêm mỡ hành nếu thích.',
    image:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 2,
    name: 'Cơm gà xối mỡ',
    category: 'com',
    priceRange: '40.000đ - 60.000đ',
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 3,
    name: 'Cơm chiên hải sản',
    category: 'com',
    priceRange: '55.000đ - 75.000đ',
    image:
      'https://images.unsplash.com/photo-1517244683847-7456b63c5969?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 4,
    name: 'Phở bò tái nạm',
    category: 'pho',
    priceRange: '50.000đ - 75.000đ',
    note: 'Có thể chọn ít bánh hoặc thêm rau.',
    image:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 5,
    name: 'Phở gà truyền thống',
    category: 'pho',
    priceRange: '45.000đ - 65.000đ',
    image:
      'https://images.unsplash.com/photo-1603093091831-4986e6ff6ec4?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 6,
    name: 'Phở áp chảo',
    category: 'pho',
    priceRange: '60.000đ - 85.000đ',
    image:
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 7,
    name: 'Mì xào bò',
    category: 'mi',
    priceRange: '45.000đ - 70.000đ',
    image:
      'https://images.unsplash.com/photo-1617622141573-51f18a5f1478?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 8,
    name: 'Mì quảng tôm thịt',
    category: 'mi',
    priceRange: '50.000đ - 70.000đ',
    image:
      'https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 9,
    name: 'Mì cay hải sản',
    category: 'mi',
    priceRange: '55.000đ - 85.000đ',
    note: 'Chọn cấp độ cay từ 0 đến 7.',
    image:
      'https://images.unsplash.com/photo-1623341214825-9f4f963727da?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 10,
    name: 'Bún bò Huế',
    category: 'bun',
    priceRange: '50.000đ - 75.000đ',
    image:
      'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 11,
    name: 'Bún chả Hà Nội',
    category: 'bun',
    priceRange: '45.000đ - 65.000đ',
    image:
      'https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 12,
    name: 'Bún thịt nướng',
    category: 'bun',
    priceRange: '45.000đ - 68.000đ',
    image:
      'https://images.unsplash.com/photo-1523983302122-73e869e1f850?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 13,
    name: 'Lẩu thái hải sản',
    category: 'lau',
    priceRange: '199.000đ - 329.000đ',
    image:
      'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 14,
    name: 'Lẩu gà lá é',
    category: 'lau',
    priceRange: '189.000đ - 299.000đ',
    image:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 15,
    name: 'Lẩu kim chi bò Mỹ',
    category: 'lau',
    priceRange: '229.000đ - 349.000đ',
    note: 'Phù hợp cho 2-4 người.',
    image:
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 16,
    name: 'Trà đào cam sả',
    category: 'doUong',
    priceRange: '35.000đ - 50.000đ',
    image:
      'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 17,
    name: 'Cà phê sữa đá',
    category: 'doUong',
    priceRange: '25.000đ - 45.000đ',
    image:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 18,
    name: 'Sinh tố bơ',
    category: 'doUong',
    priceRange: '35.000đ - 55.000đ',
    image:
      'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 19,
    name: 'Khoai tây chiên phô mai',
    category: 'anVat',
    priceRange: '35.000đ - 55.000đ',
    image:
      'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 20,
    name: 'Bánh tráng trộn',
    category: 'anVat',
    priceRange: '25.000đ - 40.000đ',
    image:
      'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 21,
    name: 'Nem chua rán',
    category: 'anVat',
    priceRange: '35.000đ - 60.000đ',
    note: 'Phần 10 chiếc hoặc 20 chiếc.',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'
  }
]
