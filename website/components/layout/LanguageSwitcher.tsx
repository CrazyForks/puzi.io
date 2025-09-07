"use client";

import { useTranslation } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-gray-800/50 border-gray-700 hover:bg-gray-700 text-white"
        >
          <Globe className="w-4 h-4 mr-1" />
          {language === 'en' ? 'EN' : '中文'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-gray-900 border-gray-800">
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={`cursor-pointer hover:bg-gray-800 ${language === 'en' ? 'bg-gray-800/50' : ''}`}
        >
          <span className="text-white">English</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('zh')}
          className={`cursor-pointer hover:bg-gray-800 ${language === 'zh' ? 'bg-gray-800/50' : ''}`}
        >
          <span className="text-white">中文</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}