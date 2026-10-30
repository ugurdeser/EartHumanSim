import { Group } from './Group.js';

const GROUP_COLORS = ['#ff9f1c', '#2ec4b6', '#9b5de5', '#f15bb5', '#00bbf9', '#e63946', '#8ac926'];

/** Bağlılık güdüsünün "başkalarını topluluğuna dahil etme" kısmını yönetir. */
export class GroupManager {
  constructor() {
    this.groups = [];
    this.nextId = 1;
  }

  #create() {
    const group = new Group(this.nextId, GROUP_COLORS[(this.nextId - 1) % GROUP_COLORS.length]);
    this.nextId++;
    this.groups.push(group);
    return group;
  }

  /** inviter, invitee'yi kendi topluluğuna çeker; hiçbirinin yoksa yeni topluluk kurulur. */
  invite(inviter, invitee) {
    if (inviter.group && !invitee.group) {
      inviter.group.add(invitee);
      return inviter.group;
    }
    if (!inviter.group && invitee.group) {
      invitee.group.add(inviter);
      return invitee.group;
    }
    if (!inviter.group && !invitee.group) {
      const group = this.#create();
      group.add(inviter);
      group.add(invitee);
      return group;
    }
    return null;
  }

  remove(person) {
    const group = person.group;
    if (!group) return;
    group.remove(person);
    if (group.size <= 1) {
      group.members.forEach((m) => group.remove(m));
      this.groups = this.groups.filter((g) => g !== group);
    }
  }
}
