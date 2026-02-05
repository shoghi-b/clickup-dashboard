'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Search, ChevronDown } from 'lucide-react';

interface TeamMember {
    id: string;
    username: string;
    profilePicture: string | null;
}

interface MemberSelectorProps {
    members: TeamMember[];
    selectedMemberIds: string[];
    onSelectionChange: (ids: string[]) => void;
    placeholder?: string;
}

export function MemberSelector({
    members,
    selectedMemberIds,
    onSelectionChange,
    placeholder = 'Select members'
}: MemberSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [open, setOpen] = useState(false);

    const filteredMembers = useMemo(() => {
        if (!members) return [];
        return members.filter(member =>
            member.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [members, searchTerm]);

    const handleToggleMember = (memberId: string) => {
        const newSelection = selectedMemberIds.includes(memberId)
            ? selectedMemberIds.filter(id => id !== memberId)
            : [...selectedMemberIds, memberId];
        onSelectionChange(newSelection);
    };

    const handleSelectAll = () => {
        onSelectionChange(members.map(m => m.id));
    };

    const handleDeselectAll = () => {
        onSelectionChange([]);
    };

    const getDisplayText = () => {
        const selected = selectedMemberIds.length;
        const total = members?.length || 0;
        if (selected === 0) return placeholder;
        if (selected === total) return `All members (${total})`;
        return `${selected} member${selected > 1 ? 's' : ''} selected`;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                    <span className="truncate">{getDisplayText()}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
                <div className="p-2 border-b flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleSelectAll} className="flex-1">
                        Select All
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDeselectAll} className="flex-1">
                        Deselect All
                    </Button>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                    {filteredMembers.length > 0 ? (
                        filteredMembers.map(member => (
                            <div
                                key={member.id}
                                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => handleToggleMember(member.id)}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedMemberIds.includes(member.id)}
                                    onChange={() => handleToggleMember(member.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                {member.profilePicture ? (
                                    <img
                                        src={member.profilePicture}
                                        alt={member.username}
                                        className="w-6 h-6 rounded-full"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                        {member.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="text-sm">{member.username}</span>
                            </div>
                        ))
                    ) : (
                        <div className="p-2 text-center text-sm text-gray-500">
                            No members found.
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
