import React from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

type IconName =
  | 'home'
  | 'egg'
  | 'storefront'
  | 'medical'
  | 'person'
  | 'add'
  | 'arrow-back'
  | 'arrow-forward'
  | 'calendar'
  | 'checkmark'
  | 'checkmark-circle'
  | 'close'
  | 'grid'
  | 'menu'
  | 'layers'
  | 'warning'
  | 'trending-up'
  | 'camera'
  | 'nutrition'
  | 'fitness'
  | 'leaf'
  | 'time'
  | 'information-circle'
  | 'analytics'
  | 'flash'
  | 'document-text'
  | 'list'
  | 'chevron-forward'
  | 'scan'
  | 'star'
  | 'cart'
  | 'add-circle'
  | 'search'
  | 'chatbubble'
  | 'create'
  | 'trash'
  | 'shield-checkmark'
  | 'alert-circle'
  | 'refresh'
  | 'archive'
  | 'flag'
  | 'construct'
  | 'bag'
  | 'person-circle'
  | 'settings'
  | 'log-out'
  | 'notifications'
  | 'help-circle'
  | 'mail'
  | 'call'
  | 'location'
  | 'image'
  | 'attach'
  | 'send'
  | 'ellipsis-vertical'
  | 'heart'
  | 'share'
  | 'bookmark'
  | 'filter'
  | 'download'
  | 'cloud-upload'
  | 'eye'
  | 'eye-off'
  | 'calendar-outline'
  | 'hourglass'
  | 'people'
  | 'scale'
  | 'cash'
  | 'close-circle'
  | 'square-outline'
  | 'checkbox'
  | 'bicycle'
  | 'car'
  | 'car-sport'
  | 'card'
  | 'alert-triangle'
  | 'map'
  | 'chatbubbles-outline'
  | 'cube'
  | 'eyedrop'
  | 'uber-eats'
  | 'moon'
  | 'sunny'
  | 'cloud-offline'
  | 'bug'
  | 'diamond';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  iconSet?: 'ionicons' | 'material';
}

const iconMap: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  'home': 'home',
  'egg': 'egg',
  'storefront': 'storefront',
  'medical': 'medical',
  'person': 'person',
  'add': 'add',
  'arrow-back': 'arrow-back',
  'arrow-forward': 'arrow-forward',
  'calendar': 'calendar',
  'checkmark': 'checkmark',
  'checkmark-circle': 'checkmark-circle',
  'close': 'close',
  'grid': 'grid',
  'menu': 'menu',
  'layers': 'layers',
  'warning': 'warning',
  'trending-up': 'trending-up',
  'camera': 'camera',
  'nutrition': 'nutrition',
  'fitness': 'fitness',
  'leaf': 'leaf',
  'time': 'time',
  'information-circle': 'information-circle',
  'analytics': 'analytics',
  'flash': 'flash',
  'document-text': 'document-text',
  'list': 'list',
  'chevron-forward': 'chevron-forward',
  'scan': 'scan',
  'star': 'star',
  'cart': 'cart',
  'add-circle': 'add-circle',
  'search': 'search',
  'chatbubble': 'chatbubble',
  'create': 'create',
  'trash': 'trash',
  'shield-checkmark': 'shield-checkmark',
  'alert-circle': 'alert-circle',
  'refresh': 'refresh',
  'archive': 'archive',
  'flag': 'flag',
  'construct': 'construct',
  'bag': 'bag',
  'person-circle': 'person-circle',
  'settings': 'settings',
  'log-out': 'log-out',
  'notifications': 'notifications',
  'help-circle': 'help-circle',
  'mail': 'mail',
  'call': 'call',
  'location': 'location',
  'image': 'image',
  'attach': 'attach',
  'send': 'send',
  'ellipsis-vertical': 'ellipsis-vertical',
  'heart': 'heart',
  'share': 'share',
  'bookmark': 'bookmark',
  'filter': 'filter',
  'download': 'download',
  'cloud-upload': 'cloud-upload',
  'eye': 'eye',
  'eye-off': 'eye-off',
  'calendar-outline': 'calendar-outline',
  'hourglass': 'hourglass',
  'people': 'people',
  'scale': 'scale',
  'cash': 'cash',
  'close-circle': 'close-circle',
  'square-outline': 'square-outline',
  'checkbox': 'checkbox',
  'bicycle': 'bicycle',
  'car': 'car',
  'car-sport': 'car-sport',
  'card': 'card',
  'alert-triangle': 'warning',
  'map': 'map',
  'chatbubbles-outline': 'chatbubbles-outline',
  'cube': 'cube',
  'eyedrop': 'eyedrop',
  'uber-eats': 'car',
  'moon': 'moon',
  'sunny': 'sunny',
  'cloud-offline': 'cloud-offline',
  'bug': 'bug',
  'diamond': 'diamond',
};

const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#000000', iconSet = 'ionicons' }) => {
  const iconName = iconMap[name as IconName] || 'help-circle';

  if (iconSet === 'material') {
    return <MaterialIcons name={iconName as any} size={size} color={color} />;
  }

  return <Ionicons name={iconName as any} size={size} color={color} />;
};

export default Icon;