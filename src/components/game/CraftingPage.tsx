import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GEAR_CRAFT_RECIPES, GEAR_UPGRADE_RECIPES, CRAFTING_MATERIAL_ICONS, RARITY_ORDER } from '@/game/data';
import { GearRarity, CraftingMaterialType } from '@/game/types';
import { toast } from 'sonner';
import { useState } from 'react';

const RARITY_COLORS: Record<GearRarity, string> = {
  common: 'text-muted-foreground', uncommon: 'text-green-400', rare: 'text-blue-400',
  ultra_rare: 'text-purple-400', legendary: 'text-yellow-400', mythic: 'text-pink-400',
};

export default function CraftingPage() {
  const { state, craftGear, upgradeGear, canAffordMaterials } = useGame();
  const [tab, setTab] = useState('craft');
  const mats = state.craftingMaterials || {};
  const inv = state.gearInventory || [];

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">⚗️ Crafting</h2>

      {/* Materials overview */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.entries(CRAFTING_MATERIAL_ICONS) as [CraftingMaterialType, string][]).map(([mat, icon]) => (
          <span key={mat} className="bg-muted px-2 py-1 rounded text-foreground">
            {icon} {mats[mat] || 0}
          </span>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="craft" className="text-xs">⚒️ Craft Gear</TabsTrigger>
          <TabsTrigger value="upgrade" className="text-xs">⬆️ Upgrade</TabsTrigger>
        </TabsList>

        <TabsContent value="craft">
          <div className="grid grid-cols-1 gap-2 mt-2">
            {GEAR_CRAFT_RECIPES.map(recipe => {
              const affordable = canAffordMaterials(recipe.materials, recipe.resourceCost);
              return (
                <Card key={recipe.gearName} className="bg-card/80 border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{recipe.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold ${RARITY_COLORS[recipe.rarity]}`}>
                          {recipe.gearName.replace('gear.', '').replace(/_/g, ' ')} ({recipe.slot})
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(recipe.materials).map(([mat, amt]) => (
                            <span key={mat} className={`text-xs px-1 rounded ${(mats[mat as CraftingMaterialType] || 0) >= (amt || 0) ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                              {CRAFTING_MATERIAL_ICONS[mat as CraftingMaterialType]} {mats[mat as CraftingMaterialType] || 0}/{amt}
                            </span>
                          ))}
                          {Object.entries(recipe.resourceCost).map(([res, amt]) => (
                            <span key={res} className="text-xs px-1 rounded bg-muted text-muted-foreground">{res}: {amt?.toLocaleString()}</span>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {recipe.bonuses.map(b => `${b.type} +${b.value}%`).join(', ')}
                        </div>
                      </div>
                      <Button size="sm" className="h-7 text-xs shrink-0" disabled={!affordable}
                        onClick={() => { if (craftGear(recipe.gearName)) toast.success(`Crafted ${recipe.icon}`); else toast.error('Cannot craft'); }}>
                        Craft
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="upgrade">
          {inv.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No gear to upgrade. Craft or loot some first.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 mt-2">
              {inv.map(gear => {
                const recipe = GEAR_UPGRADE_RECIPES.find(r => r.fromRarity === gear.rarity);
                if (!recipe) return (
                  <Card key={gear.id} className="bg-card/80 border-border/50 opacity-50">
                    <CardContent className="p-3 flex items-center gap-3">
                      <span className="text-xl">{gear.icon}</span>
                      <div className={`text-sm ${RARITY_COLORS[gear.rarity]}`}>{gear.name.replace('gear.', '').replace(/_/g, ' ')} — MAX</div>
                    </CardContent>
                  </Card>
                );
                const affordable = canAffordMaterials(recipe.materials, recipe.resourceCost);
                return (
                  <Card key={gear.id} className="bg-card/80 border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{gear.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${RARITY_COLORS[gear.rarity]}`}>
                            {gear.name.replace('gear.', '').replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {gear.rarity} → <span className={RARITY_COLORS[recipe.toRarity]}>{recipe.toRarity}</span> · {recipe.statMultiplier}x stats
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(recipe.materials).map(([mat, amt]) => (
                              <span key={mat} className={`text-xs px-1 rounded ${(mats[mat as CraftingMaterialType] || 0) >= (amt || 0) ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                {CRAFTING_MATERIAL_ICONS[mat as CraftingMaterialType]} {mats[mat as CraftingMaterialType] || 0}/{amt}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button size="sm" className="h-7 text-xs shrink-0" disabled={!affordable}
                          onClick={() => { if (upgradeGear(gear.id)) toast.success('Upgraded!'); else toast.error('Failed'); }}>
                          Upgrade
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
