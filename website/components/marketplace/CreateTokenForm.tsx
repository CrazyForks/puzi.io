"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, Loader2, Coins } from "lucide-react";
import { useCreateToken } from "./hooks/useCreateToken";

interface CreateTokenFormProps {
  onTokenCreated?: () => void;
}

export function CreateTokenForm({ onTokenCreated }: CreateTokenFormProps) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState("9");
  const [initialSupply, setInitialSupply] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  
  const { createToken, loading } = useCreateToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !symbol || !initialSupply) {
      alert("请填写所有必填字段");
      return;
    }

    const supply = parseFloat(initialSupply);
    if (supply <= 0) {
      alert("初始供应量必须大于 0");
      return;
    }

    const decimalsNumber = parseInt(decimals);
    if (decimalsNumber < 0 || decimalsNumber > 9) {
      alert("小数位数必须在 0-9 之间");
      return;
    }

    const result = await createToken({
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      decimals: decimalsNumber,
      initialSupply: supply,
      description: description.trim() || undefined,
    });

    if (result) {
      // 重置表单
      setName("");
      setSymbol("");
      setDecimals("9");
      setInitialSupply("");
      setDescription("");
      setShowForm(false);
      
      // 通知父组件刷新
      onTokenCreated?.();
    }
  };

  if (!showForm) {
    return (
      <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
        <CardContent className="p-6">
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建新代币
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/20 backdrop-blur-sm border border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Coins className="w-5 h-5" />
          创建新代币
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 代币名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              代币名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: My Awesome Token"
              maxLength={50}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {/* 代币符号 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              代币符号 *
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="例如: MAT"
              maxLength={10}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {/* 小数位数和初始供应量 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                小数位数
              </label>
              <select
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-purple-500"
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                初始供应量 *
              </label>
              <input
                type="number"
                value={initialSupply}
                onChange={(e) => setInitialSupply(e.target.value)}
                placeholder="1000000"
                min="1"
                step="any"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              描述 (可选)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述你的代币..."
              rows={3}
              maxLength={200}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/200 字符
            </p>
          </div>

          {/* 费用提示 */}
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-sm text-yellow-200">
              💡 创建代币需要约 0.002 SOL 的网络费用
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  创建代币
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}