
import React, { useState } from 'react';
import { Users, Plus, Trash2, Edit2, X, Save, Building2, CreditCard, Sparkles } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';
import { Party, PartyRole, ProcessDefinition } from '../types';

interface PartiesManagerProps {
    processDef: ProcessDefinition;
    setProcessDef: React.Dispatch<React.SetStateAction<ProcessDefinition>>;
    onClose: () => void;
}

export const PartiesManager: React.FC<PartiesManagerProps> = ({ processDef, setProcessDef, onClose }) => {
    const [view, setView] = useState<'list' | 'edit'>('list');
    const [editingParty, setEditingParty] = useState<Party | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [role, setRole] = useState<PartyRole>('Other');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');

    // Bank Details
    const [accountName, setAccountName] = useState('');
    const [sortCode, setSortCode] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');

    const handleEdit = (party: Party) => {
        setEditingParty(party);
        setName(party.name);
        setRole(party.role);
        setEmail(party.email || '');
        setPhone(party.phone || '');
        setAddress(party.address || '');
        setNotes(party.notes || '');

        if (party.bankDetails) {
            setAccountName(party.bankDetails.accountName);
            setSortCode(party.bankDetails.sortCode);
            setAccountNumber(party.bankDetails.accountNumber);
            setBankName(party.bankDetails.bankName || '');
        } else {
            setAccountName('');
            setSortCode('');
            setAccountNumber('');
            setBankName('');
        }
        setView('edit');
    };

    const handleNew = () => {
        setEditingParty(null);
        setName('');
        setRole('Other');
        setEmail('');
        setPhone('');
        setAddress('');
        setNotes('');
        setAccountName('');
        setSortCode('');
        setAccountNumber('');
        setBankName('');
        setView('edit');
    };

    const handleSave = () => {
        if (!name.trim()) return alert("Name is required");

        const newParty: Party = {
            id: editingParty ? editingParty.id : `party_${Date.now()}`,
            name,
            role,
            email,
            phone,
            address,
            notes,
            bankDetails: (accountName || sortCode || accountNumber) ? {
                accountName,
                sortCode,
                accountNumber,
                bankName
            } : undefined
        };

        const currentParties = processDef.parties || [];
        let newParties;

        if (editingParty) {
            newParties = currentParties.map(p => p.id === editingParty.id ? newParty : p);
        } else {
            newParties = [...currentParties, newParty];
        }

        setProcessDef({ ...processDef, parties: newParties });
        setView('list');
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure?")) {
            const newParties = (processDef.parties || []).filter(p => p.id !== id);
            setProcessDef({ ...processDef, parties: newParties });
        }
    };

    return (
        <ModalWrapper
            title="Key Parties Manager"
            icon={Users}
            onClose={onClose}
            modalSize={{ width: 800, height: 'auto' }}
            onResizeStart={() => { }}
        >
            <div className="flex flex-col">
                {view === 'list' && (
                    <div className="flex flex-col min-h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm text-gray-500">Define global entities (people, orgs) referenced in this process.</p>
                            <button
                                onClick={handleNew}
                                className="bg-sw-teal text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sw-tealHover transition-colors"
                            >
                                <Plus size={16} /> Add Party
                            </button>
                        </div>

                        <div className="flex-1 space-y-3 pr-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {(!processDef.parties || processDef.parties.length === 0) && (
                                <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                    <Users size={48} className="mx-auto mb-2 opacity-50" />
                                    <p>No parties defined yet.</p>
                                </div>
                            )}

                            {(processDef.parties || []).map(party => (
                                <div key={party.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start group hover:shadow-md transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${party.role === 'Bank' ? 'bg-indigo-100 text-indigo-600' : 'bg-sw-lightTeal text-sw-teal'}`}>
                                            {party.role === 'Bank' ? <Building2 size={20} /> : <Users size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg">{party.name}</h4>
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded">{party.role}</span>
                                            </div>
                                            {(party.email || party.phone) && (
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {party.email && <span>{party.email} • </span>}
                                                    {party.phone && <span>{party.phone}</span>}
                                                </div>
                                            )}
                                            {party.bankDetails && (
                                                <div className="flex items-center gap-1 text-xs text-indigo-600 mt-2 bg-indigo-50 px-2 py-1 rounded w-fit">
                                                    <CreditCard size={12} />
                                                    Bank Details Configured
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(party)} className="p-2 text-gray-400 hover:text-sw-teal hover:bg-gray-50 rounded-lg">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(party.id)} className="p-2 text-gray-400 hover:text-sw-red hover:bg-red-50 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'edit' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div className="flex gap-4 items-center">
                                <button onClick={() => setView('list')} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                                <h3 className="text-lg font-bold text-gray-800">{editingParty ? 'Edit Party' : 'New Party'}</h3>
                            </div>
                            <button
                                onClick={() => {
                                    const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Evan", "Fiona"];
                                    const lastNames = ["Smith", "Jones", "Taylor", "Brown", "Wilson", "Evans"];
                                    const companies = ["Acme Corp", "Globex", "Initech", "Umbrella Corp", "Stark Ind"];
                                    const roles: PartyRole[] = ["Solicitor", "Bank", "Beneficiary", "Claimant", "Doctor", "Employer", "Other"];

                                    const isCompany = Math.random() > 0.7;
                                    const randomName = isCompany
                                        ? companies[Math.floor(Math.random() * companies.length)]
                                        : `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

                                    setName(randomName);
                                    setRole(roles[Math.floor(Math.random() * roles.length)]);
                                    setEmail(isCompany ? `contact@${randomName.toLowerCase().replace(/\s/g, '')}.com` : `${randomName.toLowerCase().replace(/\s/g, '.')}@example.com`);
                                    setPhone(`07${Math.floor(Math.random() * 1000000000)}`);
                                    setAddress(`${Math.floor(Math.random() * 100)} Main St, London, UK`);
                                    setNotes("Auto-generated test party.");

                                    if (Math.random() > 0.3) {
                                        setAccountName(randomName);
                                        setSortCode(`${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}`);
                                        setAccountNumber(`${Math.floor(10000000 + Math.random() * 89999999)}`);
                                        setBankName("Test Bank PLC");
                                    }
                                }}
                                className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-200 font-bold flex items-center gap-1 transition-colors"
                            >
                                <Sparkles size={14} /> Auto-Fill Data
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Basic Info */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mb-2">Basic Info</h4>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Name / Organization</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-sw-teal outline-none"
                                        placeholder="e.g. John Doe, Acme Corp"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Role</label>
                                        <select
                                            value={role}
                                            onChange={e => setRole(e.target.value as PartyRole)}
                                            className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-sw-teal outline-none"
                                        >
                                            <option value="Solicitor">Solicitor</option>
                                            <option value="Bank">Bank</option>
                                            <option value="Beneficiary">Beneficiary</option>
                                            <option value="Claimant">Claimant</option>
                                            <option value="Doctor">Doctor</option>
                                            <option value="Employer">Employer</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Phone</label>
                                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-1.5 text-sm border border-gray-300 rounded" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-1.5 text-sm border border-gray-300 rounded" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Address</label>
                                    <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full p-1.5 text-sm border border-gray-300 rounded h-16 resize-none" />
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest border-b pb-1 mb-2">Bank Details (Optional)</h4>
                                <div className="bg-indigo-50/50 p-3 rounded-xl space-y-2 border border-indigo-100">
                                    <div>
                                        <label className="block text-[10px] font-bold text-indigo-700 mb-1">Account Name</label>
                                        <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} className="w-full p-1.5 text-sm border border-indigo-200 rounded bg-white" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-indigo-700 mb-1">Sort Code</label>
                                            <input type="text" value={sortCode} onChange={e => setSortCode(e.target.value)} className="w-full p-1.5 text-sm border border-indigo-200 rounded bg-white" placeholder="XX-XX-XX" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-indigo-700 mb-1">Account Number</label>
                                            <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="w-full p-1.5 text-sm border border-indigo-200 rounded bg-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-indigo-700 mb-1">Bank Name</label>
                                        <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full p-1.5 text-sm border border-indigo-200 rounded bg-white" />
                                    </div>
                                </div>

                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1 mt-4 mb-2">Notes</h4>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-1.5 text-sm border border-gray-300 rounded h-14 resize-none" placeholder="Internal notes..." />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                            <button onClick={() => setView('list')} className="px-6 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 rounded-lg font-bold bg-sw-teal text-white hover:bg-sw-tealHover shadow-md flex items-center gap-2">
                                <Save size={18} /> Save & Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </ModalWrapper>
    );
};
