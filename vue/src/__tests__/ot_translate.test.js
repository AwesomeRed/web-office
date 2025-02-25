import { describe, it, expect } from 'vitest';
import OT from '@/utils/quill_type';

const { Delta, type } = OT;

describe('Delta类型基础操作测试', () => {
  const doc = [
    {
      insert: 'World!',
    },
  ];

  it('插入Hello,文本到位置 0', () => {
    const op = [{ insert: 'Hello,' }];
    expect(type.apply(doc, op)).toEqual(new Delta([{ insert: 'Hello,World!' }]));
  });

  it('插入a文本到位置 2', () => {
    const op = [{ retain: 2 }, { insert: 'a' }];
    expect(type.apply(doc, op)).toEqual(new Delta([{ insert: 'Woarld!' }]));
  });

  it('删除位置 0 到位置 5 的文本', () => {
    const op = [{ delete: 5, length: 5 }];
    expect(type.apply(doc, op)).toEqual(new Delta([{ insert: '!' }]));
  });
});

describe('并发操作转换测试', () => {
  const doc = [{ insert: 'abc' }];

  it('两个用户同时在位置 1 插入不同内容', () => {
    const opA = [{ retain: 1 }, { insert: 'A' }];
    const opB = [{ retain: 1 }, { insert: 'B' }];

    // 转换操作（用户B的视角转换用户A的操作，原操作 opA 被视为在冲突位置（位置 1）的右侧。）
    const transformOpA = type.transform(opA, opB, 'left');
    // 验证转换后的操作OpA的pos + 1
    expect(transformOpA).toEqual(new Delta([{ retain: 2 }, { insert: 'A' }]));

    let result = doc;
    result = type.apply(result, opB);
    result = type.apply(result, transformOpA); // 再应用转换后的操作
    expect(result).toEqual(new Delta([{ insert: 'aBAbc' }]));
  });

  it('用户A插入，用户B删除同一位置', () => {
    // 从用户B的视角看
    const opA = [{ retain: 1 }, { insert: 'A' }];
    const opB = [{ retain: 1 }, { delete: 1 }];
    const transformOpA = type.transform(opA, opB, 'left');

    let result = doc;
    result = type.apply(result, opB);
    result = type.apply(result, transformOpA); // 再应用转换后的操作
    expect(result).toEqual(new Delta([{ insert: 'aAc' }]));
  });

  it('最终一致性', () => {
    let clientA = doc;
    let clientB = doc;

    const opA = [{ retain: 1 }, { insert: 'A' }];
    const opB = [{ retain: 1 }, { insert: 'B' }];

    clientA = type.apply(clientA, opA);
    const AtransformOpB = type.transform(opB, opA, 'left');
    clientA = type.apply(clientA, AtransformOpB);

    // 这里交换接收顺序再试一次
    clientB = type.apply(clientB, opB);
    const BtransformOpA = type.transform(opA, opB, 'right');
    clientB = type.apply(clientB, BtransformOpA);

    // 最终结果应该是一致的
    expect(clientA).toEqual(new Delta([{ insert: 'aABbc' }]));
    expect(clientB).toEqual(new Delta([{ insert: 'aABbc' }]));
  });
});
