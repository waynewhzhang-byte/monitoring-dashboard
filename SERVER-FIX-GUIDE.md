# 服务器端修复指南

## 问题

服务器上构建时出现语法错误：
```
./src/components/topology/HierarchicalTopologyViewer.tsx
Error: Expected ',', got '}'
  240 │                   }, {
  241 │                     duration: 600,
  242 │                     }
  243 │                   });
```

## 原因

服务器上的文件在修复时可能出现了格式错误，`duration: 600,` 后面有一个多余的 `}`。

## 快速修复（在服务器上执行）

### 方法 1：使用修复脚本（最简单）

```bash
cd /opt/monitoring-app

# 给脚本添加执行权限
chmod +x scripts/fix-animate-simple.sh

# 运行修复脚本
./scripts/fix-animate-simple.sh

# 重新构建
rm -rf .next
npm run build
```

### 方法 2：使用 sed 命令（如果脚本不可用）

```bash
cd /opt/monitoring-app

# 备份文件
cp src/components/topology/HierarchicalTopologyViewer.tsx src/components/topology/HierarchicalTopologyViewer.tsx.bak

# 修复1: 移除 duration 后面的逗号
sed -i 's/duration:[[:space:]]*600,[[:space:]]*$/duration: 600/g' src/components/topology/HierarchicalTopologyViewer.tsx

# 修复2: 修复 }, { duration: 600, } 格式
sed -i 's/}, {[[:space:]]*duration:[[:space:]]*600,[[:space:]]*}[[:space:]]*);/}, { duration: 600 });/g' src/components/topology/HierarchicalTopologyViewer.tsx

# 修复3: 处理多行格式（如果 }, { duration: 600, } 后面还有单独的 }）
# 使用 perl（如果可用）
if command -v perl &> /dev/null; then
    perl -i -pe 's/}, \{\s*duration:\s*600,\s*\}\s*\);/}, { duration: 600 });/g' src/components/topology/HierarchicalTopologyViewer.tsx
fi

# 修复4: 确保有 setTimeout（如果还没有）
if ! grep -A 10 "duration: 600" src/components/topology/HierarchicalTopologyViewer.tsx | grep -q "setTimeout"; then
    sed -i '/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*});/a\
                  \
                  // Update label positions after animation completes\
                  setTimeout(() => {\
                    if (sigmaRef.current && graphRef.current) {\
                      updateLabelPositions();\
                    }\
                  }, 650);' src/components/topology/HierarchicalTopologyViewer.tsx
fi

# 验证修复
echo "验证修复后的代码（第 236-250 行）："
sed -n '236,250p' src/components/topology/HierarchicalTopologyViewer.tsx

# 重新构建
rm -rf .next
npm run build
```

### 方法 3：手动编辑（最可靠）

```bash
cd /opt/monitoring-app

# 编辑文件
vi src/components/topology/HierarchicalTopologyViewer.tsx

# 按 i 进入编辑模式
# 找到第 240-242 行，将：
#                   }, {
#                     duration: 600,
#                     }
#                   });

# 改为：
#                   }, {
#                     duration: 600
#                   });
#                   
#                   // Update label positions after animation completes
#                   setTimeout(() => {
#                     if (sigmaRef.current && graphRef.current) {
#                       updateLabelPositions();
#                     }
#                   }, 650);

# 按 ESC，然后输入 :wq 保存并退出
```

## 正确的代码格式

修复后，第 236-250 行应该是：

```typescript
sigma.getCamera().animate({
  x: centerX,
  y: adjustedY,
  ratio: ratio,
}, { 
  duration: 600
});

// Update label positions after animation completes
setTimeout(() => {
  if (sigmaRef.current && graphRef.current) {
    updateLabelPositions();
  }
}, 650);
```

## 验证修复

修复后，检查代码：

```bash
# 查看修复后的代码
sed -n '236,250p' src/components/topology/HierarchicalTopologyViewer.tsx

# 应该看到：
#                   }, {
#                     duration: 600
#                   });
#                   
#                   // Update label positions after animation completes
#                   setTimeout(() => {
```

## 一键修复命令（复制粘贴执行）

```bash
cd /opt/monitoring-app && \
cp src/components/topology/HierarchicalTopologyViewer.tsx src/components/topology/HierarchicalTopologyViewer.tsx.bak && \
sed -i 's/duration:[[:space:]]*600,[[:space:]]*$/duration: 600/g' src/components/topology/HierarchicalTopologyViewer.tsx && \
sed -i 's/}, {[[:space:]]*duration:[[:space:]]*600,[[:space:]]*}[[:space:]]*);/}, { duration: 600 });/g' src/components/topology/HierarchicalTopologyViewer.tsx && \
if ! grep -A 10 "duration: 600" src/components/topology/HierarchicalTopologyViewer.tsx | grep -q "setTimeout"; then sed -i '/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*});/a\                  \n                  // Update label positions after animation completes\n                  setTimeout(() => {\n                    if (sigmaRef.current && graphRef.current) {\n                      updateLabelPositions();\n                    }\n                  }, 650);' src/components/topology/HierarchicalTopologyViewer.tsx; fi && \
echo "✅ 修复完成，验证代码：" && \
sed -n '236,250p' src/components/topology/HierarchicalTopologyViewer.tsx && \
rm -rf .next && \
npm run build
```
