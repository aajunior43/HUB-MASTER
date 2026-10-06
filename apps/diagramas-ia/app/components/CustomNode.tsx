'use client'

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Edit2 } from 'lucide-react'

interface CustomNodeData {
  label: string
  type: string
}

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(data.label)

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
  }

  const getNodeStyle = () => {
    const getTypeStyles = () => {
      switch (data.type) {
        case 'circle':
          return {
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: `2px solid ${selected ? '#3b82f6' : '#059669'}`,
          }
        case 'diamond':
          return {
            borderRadius: '0',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: 'white',
            border: `2px solid ${selected ? '#3b82f6' : '#d97706'}`,
            transform: 'rotate(45deg)',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }
        default: // rectangle
          return {
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            border: `2px solid ${selected ? '#1d4ed8' : '#2563eb'}`,
          }
      }
    }

    const baseStyle = {
      padding: '12px 16px',
      minWidth: '120px',
      textAlign: 'center' as const,
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: selected 
        ? '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' 
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      transition: 'all 0.2s ease-in-out',
      cursor: 'pointer',
      ...getTypeStyles(),
    }

    return baseStyle
  }

  const getLabelStyle = () => {
    if (data.type === 'diamond') {
      return {
        transform: 'rotate(-45deg)',
        whiteSpace: 'nowrap' as const,
      }
    }
    return {}
  }

  return (
    <div style={getNodeStyle()}>
      <Handle type="target" position={Position.Top} />
      
      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyPress={handleKeyPress}
          onBlur={handleBlur}
          autoFocus
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            textAlign: 'center',
            width: '100%',
            ...getLabelStyle(),
          }}
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          style={getLabelStyle()}
          className="cursor-pointer"
        >
          {label}
        </div>
      )}

      {selected && !isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute -top-2 -right-2 p-1 bg-primary text-white rounded-full hover:bg-blue-600"
          style={{ transform: data.type === 'diamond' ? 'rotate(-45deg)' : 'none' }}
        >
          <Edit2 size={12} />
        </button>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default memo(CustomNode)