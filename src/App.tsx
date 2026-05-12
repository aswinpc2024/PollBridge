import { useState, useEffect } from 'react';
import { ShoppingCart, Package, CupSoda, Home, Link, BarChart3, ArrowRight, Check, Copy, ExternalLink } from 'lucide-react';
import { fetchCategories, fetchItemsByCategory, fetchPolls, buildSwiggyUrl } from './lib/api';
import type { Category, Item, PollDataEntry, Poll } from './lib/types';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Snacks: <Package className="w-5 h-5" />,
  Beverages: <CupSoda className="w-5 h-5" />,
  Household: <Home className="w-5 h-5" />,
};

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [polls, setPolls] = useState<Poll[]>([]);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [cats, pollData] = await Promise.all([fetchCategories(), fetchPolls()]);
      setCategories(cats);
      setPolls(pollData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCategorySelect(categoryId: string) {
    setSelectedCategory(categoryId);
    setSelectedItems(new Map());
    setGeneratedUrl(null);
    try {
      const data = await fetchItemsByCategory(categoryId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  }

  function toggleItem(item: Item) {
    const next = new Map(selectedItems);
    const current = next.get(item.sku) || 0;
    if (current > 0) {
      next.delete(item.sku);
    } else {
      next.set(item.sku, 1);
    }
    setSelectedItems(next);
    setGeneratedUrl(null);
  }

  function incrementQty(sku: string) {
    const next = new Map(selectedItems);
    next.set(sku, (next.get(sku) || 0) + 1);
    setSelectedItems(next);
    setGeneratedUrl(null);
  }

  function decrementQty(sku: string) {
    const next = new Map(selectedItems);
    const current = next.get(sku) || 0;
    if (current <= 1) {
      next.delete(sku);
    } else {
      next.set(sku, current - 1);
    }
    setSelectedItems(next);
    setGeneratedUrl(null);
  }

  function generatePollUrl() {
    const pollData: PollDataEntry[] = [];
    selectedItems.forEach((qty, sku) => {
      const item = items.find((i) => i.sku === sku);
      pollData.push({ sku, qty, name: item?.name });
    });
    const url = buildSwiggyUrl(pollData);
    setGeneratedUrl(url);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedCategoryName = categories.find((c) => c.id === selectedCategory)?.name || '';
  const totalItems = selectedItems.size;
  const totalQty = Array.from(selectedItems.values()).reduce((a, b) => a + b, 0);
  const totalPrice = Array.from(selectedItems.entries()).reduce((sum, [sku, qty]) => {
    const item = items.find((i) => i.sku === sku);
    return sum + (item?.price || 0) * qty;
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Poll Bridge</h1>
              <p className="text-xs text-gray-500">Group ordering for Swiggy Instamart</p>
            </div>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('order')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'order'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              New Order
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              History
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'order' ? (
          <div className="space-y-6">
            {/* Step 1: Category Picker */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <h2 className="text-base font-semibold text-gray-900">Pick a Category</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      selectedCategory === cat.id
                        ? 'border-orange-500 bg-orange-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {CATEGORY_ICONS[cat.name] || <Package className="w-5 h-5" />}
                    </div>
                    <span
                      className={`font-medium ${
                        selectedCategory === cat.id ? 'text-orange-700' : 'text-gray-700'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Step 2: Item Selection */}
            {selectedCategory && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <h2 className="text-base font-semibold text-gray-900">
                    Select Items from {selectedCategoryName}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((item) => {
                    const isSelected = selectedItems.has(item.sku);
                    const qty = selectedItems.get(item.sku) || 0;
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            onClick={() => toggleItem(item)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-orange-500 border-orange-500'
                                    : 'border-gray-300'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="font-medium text-gray-900 text-sm">
                                {item.name}
                              </span>
                            </div>
                            <div className="mt-1 ml-7 flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-mono">
                                {item.sku}
                              </span>
                              <span className="text-xs text-gray-300">|</span>
                              <span className="text-sm font-semibold text-gray-700">
                                Rs.{item.price.toFixed(0)}
                              </span>
                            </div>
                          </button>
                          {isSelected && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => decrementQty(item.sku)}
                                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold transition-colors"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-sm font-bold text-gray-900">
                                {qty}
                              </span>
                              <button
                                onClick={() => incrementQty(item.sku)}
                                className="w-7 h-7 rounded-lg bg-orange-100 hover:bg-orange-200 flex items-center justify-center text-orange-600 text-sm font-bold transition-colors"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Step 3: Generate & Share */}
            {totalItems > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <h2 className="text-base font-semibold text-gray-900">Generate Poll Link</h2>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        <strong className="text-gray-900">{totalItems}</strong> items
                      </span>
                      <span>
                        <strong className="text-gray-900">{totalQty}</strong> qty
                      </span>
                      <span>
                        Rs.<strong className="text-gray-900">{totalPrice.toFixed(0)}</strong>
                      </span>
                    </div>
                  </div>

                  {!generatedUrl ? (
                    <button
                      onClick={generatePollUrl}
                      className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                      <Link className="w-4 h-4" />
                      Generate Swiggy Link
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3 break-all text-xs font-mono text-gray-700 border border-gray-200">
                        {generatedUrl}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(generatedUrl)}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy Link
                            </>
                          )}
                        </button>
                        <a
                          href={generatedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open Swiggy
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* How It Works */}
            <section className="mt-8">
              <h2 className="text-base font-semibold text-gray-900 mb-4">How It Works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    step: '1',
                    title: 'Pick & Vote',
                    desc: 'Select a category and items. Share the poll link in Google Chat for your team to vote.',
                  },
                  {
                    step: '2',
                    title: 'Finalize Poll',
                    desc: 'The Chat Bot tallies votes and generates a Swiggy Instamart URL with poll data.',
                  },
                  {
                    step: '3',
                    title: 'Auto-Add to Cart',
                    desc: 'The Chrome Extension reads the URL and automatically adds all items to your Swiggy cart.',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="bg-white rounded-xl border border-gray-200 p-5"
                  >
                    <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-bold text-sm mb-3">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* History Tab */
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Poll History</h2>
            </div>
            {polls.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">No polls yet. Create your first group order!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {polls.map((poll) => (
                  <div
                    key={poll.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 text-sm">{poll.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            poll.status === 'finalized'
                              ? 'bg-green-100 text-green-700'
                              : poll.status === 'active'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {poll.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(poll.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {poll.poll_url && (
                      <a
                        href={poll.poll_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-orange-500 hover:text-orange-600 text-sm font-medium transition-colors"
                      >
                        Open <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-xs text-gray-400 text-center">
            Poll Bridge for Swiggy Instamart. SKU IDs are dynamic and can be swapped in the database.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
