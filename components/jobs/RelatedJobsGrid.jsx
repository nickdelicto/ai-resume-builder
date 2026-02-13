import React from 'react';
import Link from 'next/link';

const COLOR_SCHEMES = {
  blue: {
    bg: 'bg-blue-50',
    hover: 'hover:bg-blue-100',
    text: 'group-hover:text-blue-700',
    badge: 'text-blue-600',
  },
  purple: {
    bg: 'bg-purple-50',
    hover: 'hover:bg-purple-100',
    text: 'group-hover:text-purple-700',
    badge: 'text-purple-600',
  },
  green: {
    bg: 'bg-green-50',
    hover: 'hover:bg-green-100',
    text: 'group-hover:text-green-700',
    badge: 'text-green-600',
  },
  orange: {
    bg: 'bg-orange-50',
    hover: 'hover:bg-orange-100',
    text: 'group-hover:text-orange-700',
    badge: 'text-orange-600',
  },
};

/**
 * RelatedJobsGrid - Card grid showing related job links with counts
 *
 * Used in soft zero pages to show cross-dimensional navigation:
 * "Other Shifts in New Haven", "ICU Jobs in Other States", etc.
 *
 * @param {string} title - Section heading
 * @param {Array} items - [{label, href, count}]
 * @param {string} colorScheme - 'blue' | 'purple' | 'green' | 'orange'
 */
const RelatedJobsGrid = ({ title, items, colorScheme = 'blue' }) => {
  if (!items || items.length === 0) return null;

  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.blue;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            className={`flex items-center justify-between gap-2 px-4 py-3 ${colors.bg} ${colors.hover} rounded-lg group transition-colors`}
          >
            <span className={`text-gray-900 ${colors.text} font-medium`}>{item.label}</span>
            <span className={`${colors.badge} font-semibold bg-white px-2 py-0.5 rounded-full text-xs`}>
              {item.count} {item.count === 1 ? 'job' : 'jobs'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedJobsGrid;
