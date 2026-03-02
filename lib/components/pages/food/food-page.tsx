'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { FOODS, FOOD_CATEGORIES, FoodCategory, FoodItem } from '@/lib/data/foods'
import { setAlert } from '@/lib/features/alert/alertSlice'

const DELIVERY_TIME_OPTIONS = [
  { value: 'ngay', label: 'Ngay bây giờ' },
  { value: 'trua', label: 'Buổi trưa' },
  { value: 'chieu', label: 'Buổi chiều' },
  { value: 'toi', label: 'Buổi tối' },
  { value: 'cuoi-tuan', label: 'Cuối tuần' }
]

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'

const FoodImage = ({ src, alt }: { src?: string; alt: string }) => {
  const [hasError, setHasError] = useState(false)
  const imageSrc = hasError ? FALLBACK_IMAGE : src

  if (!imageSrc) {
    return (
      <div className="flex h-44 w-full items-center justify-center rounded-md bg-sky-100 text-center text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
        Ảnh món ăn
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      className="h-44 w-full rounded-md object-cover"
    />
  )
}

export const FoodPage = () => {
  const dispatch = useDispatch()

  const [selectedCategories, setSelectedCategories] = useState<FoodCategory[]>([])
  const [keyword, setKeyword] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isGridView, setIsGridView] = useState(true)
  const [randomFood, setRandomFood] = useState<FoodItem | null>(null)
  const [isOrderOpen, setIsOrderOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [orderName, setOrderName] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [deliveryTime, setDeliveryTime] = useState(DELIVERY_TIME_OPTIONS[0].value)

  const filteredFoods = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return FOODS.filter((food) => {
      const categoryPass =
        selectedCategories.length === 0 || selectedCategories.includes(food.category)
      const namePass =
        normalizedKeyword.length === 0 || food.name.toLowerCase().includes(normalizedKeyword)

      return categoryPass && namePass
    })
  }, [keyword, selectedCategories])

  const toggleCategory = (category: FoodCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category)
      }
      return [...prev, category]
    })
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setKeyword('')
    setRandomFood(null)
  }

  const handleRandomFood = () => {
    const randomPool = filteredFoods

    if (randomPool.length < 1) {
      dispatch(
        setAlert({
          title: 'Không có dữ liệu',
          message: 'Không tìm thấy món phù hợp để random.',
          type: 'warning'
        })
      )
      return
    }

    const randomIndex = Math.floor(Math.random() * randomPool.length)
    const pickedFood = randomPool[randomIndex]
    setRandomFood(pickedFood)

    dispatch(
      setAlert({
        title: 'Gợi ý món',
        message: `Hôm nay thử món "${pickedFood.name}" nhé.`,
        type: 'info'
      })
    )
  }

  const openOrderModal = (food: FoodItem) => {
    setSelectedFood(food)
    setOrderName(food.name)
    setOrderNotes(food.note || '')
    setDeliveryTime(DELIVERY_TIME_OPTIONS[0].value)
    setIsOrderOpen(true)
  }

  const closeOrderModal = () => {
    setIsOrderOpen(false)
    setIsSubmitting(false)
    setSelectedFood(null)
    setOrderName('')
    setOrderNotes('')
    setDeliveryTime(DELIVERY_TIME_OPTIONS[0].value)
  }

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!orderName.trim()) {
      dispatch(
        setAlert({
          title: 'Thiếu thông tin',
          message: 'Vui lòng nhập tên món.',
          type: 'error'
        })
      )
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: orderName.trim(),
          notes: orderNotes.trim() || undefined,
          deliveryTime,
          foodId: selectedFood?.id,
          category: selectedFood?.category
        })
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Gửi đơn món thất bại.')
      }

      dispatch(
        setAlert({
          title: 'Đặt món thành công',
          message: `Đã gửi yêu cầu cho món "${orderName.trim()}".`,
          type: 'success'
        })
      )

      closeOrderModal()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể gửi đơn món.'

      dispatch(
        setAlert({
          title: 'Đặt món thất bại',
          message,
          type: 'error'
        })
      )
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <hr />

      <div className="container grid grid-cols-2 items-start gap-6 pb-16 pt-4 md:grid-cols-4">
        <div className="text-center md:hidden">
          <button
            className="mb-2 mr-2 block rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300 dark:focus:ring-sky-900"
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          >
            Bộ lọc món ăn
          </button>
        </div>

        <div
          className={`fixed left-0 top-0 z-40 h-screen w-80 overflow-y-auto border border-gray-200 bg-white shadow transition-transform dark:border-gray-700 dark:bg-gray-900 ${
            isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-labelledby="food-drawer-label"
        >
          <div className="sticky top-0 bg-white px-4 pb-3 pt-4 dark:bg-gray-900">
            <h5
              id="food-drawer-label"
              className="inline-flex items-center text-base font-semibold text-gray-700 dark:text-gray-200"
            >
              Danh mục món ăn
            </h5>
            <button
              type="button"
              className="absolute right-2.5 top-2.5 inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
              onClick={() => setIsDrawerOpen(false)}
            >
              <span className="sr-only">Đóng bộ lọc</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <FoodFilters
            selectedCategories={selectedCategories}
            toggleCategory={toggleCategory}
            clearFilters={clearFilters}
          />
        </div>

        <div
          className={`fixed inset-0 z-30 bg-gray-900/50 ${isDrawerOpen ? 'block' : 'hidden'}`}
          onClick={() => setIsDrawerOpen(false)}
        />

        <div className="hidden rounded border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-900 md:block">
          <FoodFilters
            selectedCategories={selectedCategories}
            toggleCategory={toggleCategory}
            clearFilters={clearFilters}
          />
        </div>

        <div className="col-span-3">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {filteredFoods.length} món đang hiển thị
            </p>

            <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                type="text"
                placeholder="Tìm theo tên món..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />

              <button
                type="button"
                onClick={handleRandomFood}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400"
              >
                Random món
              </button>

              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsGridView(true)}
                  className={`flex h-9 w-10 items-center justify-center rounded border ${
                    isGridView
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-gray-300 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M6 1v3H1V1zM1 0a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1zm14 12v3h-5v-3zm-5-1a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1zM6 8v7H1V8zM1 7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zm14-6v7h-5V1zm-5-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setIsGridView(false)}
                  className={`flex h-9 w-10 items-center justify-center rounded border ${
                    !isGridView
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-gray-300 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path
                      fillRule="evenodd"
                      d="M4.5 11.5A.5.5 0 0 1 5 11h10a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5m-2-4A.5.5 0 0 1 3 7h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m-2-4A.5.5 0 0 1 1 3h10a.5.5 0 0 1 0 1H1a.5.5 0 0 1-.5-.5"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {randomFood && (
            <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-950/10">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Gợi ý hôm nay: <span className="font-semibold text-gray-900 dark:text-white">{randomFood.name}</span> ({randomFood.priceRange})
              </p>
            </div>
          )}

          {filteredFoods.length < 1 && (
            <div className="flex h-80 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
              <p className="text-lg font-semibold text-gray-500 dark:text-gray-300">
                Không tìm thấy món phù hợp
              </p>
              <button
                type="button"
                className="mt-2 text-sm text-sky-600 hover:text-sky-700 dark:text-sky-300"
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          <div className={`grid grid-cols-1 gap-6 ${isGridView ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`}>
            {filteredFoods.map((food) => (
              <article
                key={food.id}
                className={`flex h-full overflow-hidden rounded-lg bg-white shadow-lg dark:border dark:border-gray-700 dark:bg-transparent ${
                  isGridView ? 'flex-col' : 'flex-col sm:flex-row'
                }`}
              >
                <div className={`bg-sky-50 p-4 dark:bg-gray-800/30 ${isGridView ? '' : 'sm:w-1/3'}`}>
                  <FoodImage src={food.image} alt={food.name} />
                </div>

                <div className={`flex flex-1 flex-col p-4 ${isGridView ? '' : 'sm:w-2/3'}`}>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{food.name}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {FOOD_CATEGORIES.find((category) => category.value === food.category)?.label}
                  </p>

                  <p className="mt-4 text-base font-semibold text-rose-800 dark:text-rose-200">{food.priceRange}</p>

                  {food.note && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{food.note}</p>}

                  <button
                    type="button"
                    onClick={() => openOrderModal(food)}
                    className="mt-auto rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400"
                  >
                    Đặt món này
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {isOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Đặt món</h2>
              <button
                type="button"
                onClick={closeOrderModal}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <span className="sr-only">Đóng</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <form className="space-y-4 px-5 py-5" onSubmit={submitOrder}>
              <div>
                <label
                  htmlFor="food-name"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Tên món
                </label>
                <input
                  id="food-name"
                  name="food-name"
                  value={orderName}
                  onChange={(event) => setOrderName(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label
                  htmlFor="order-notes"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Ghi chú (tuỳ chọn)
                </label>
                <textarea
                  id="order-notes"
                  name="order-notes"
                  value={orderNotes}
                  onChange={(event) => setOrderNotes(event.target.value)}
                  rows={3}
                  placeholder="Ví dụ: ít hành, không cay..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label
                  htmlFor="delivery-time"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Thời gian giao mong muốn
                </label>
                <select
                  id="delivery-time"
                  name="delivery-time"
                  value={deliveryTime}
                  onChange={(event) => setDeliveryTime(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {DELIVERY_TIME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeOrderModal}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500 dark:hover:bg-rose-400"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

const FoodFilters = ({
  selectedCategories,
  toggleCategory,
  clearFilters
}: {
  selectedCategories: FoodCategory[]
  toggleCategory: (category: FoodCategory) => void
  clearFilters: () => void
}) => {
  return (
    <div className="space-y-4 px-4 py-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
        Danh mục
      </h3>

      <div className="space-y-2">
        {FOOD_CATEGORIES.map((category) => (
          <label
            key={category.value}
            className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm transition hover:border-sky-200 hover:bg-sky-50 dark:border-gray-800 dark:hover:border-sky-900 dark:hover:bg-sky-950/10"
          >
            <span className="text-gray-700 dark:text-gray-200">{category.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {FOODS.filter((food) => food.category === category.value).length}
              </span>
              <input
                type="checkbox"
                checked={selectedCategories.includes(category.value)}
                onChange={() => toggleCategory(category.value)}
                className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
              />
            </div>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={clearFilters}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        Xóa bộ lọc
      </button>
    </div>
  )
}
