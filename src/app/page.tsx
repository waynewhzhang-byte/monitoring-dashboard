import { redirect } from 'next/navigation';

/**
 * 首页直接跳转到大屏，避免只看到“初始化完成”的占位页
 */
export default function Home() {
  redirect('/dashboard');
}
